# P7 · BUG-13 复现：v4 降级 + 剥离签名 → 全卡解锁 → normalizeSave 洗成 v5 再导出合法签名码
# 测量纪律：独立 context；goto 前清 localStorage；导入走真实 UI（applySaveCode → validateSavePayload）
import os, json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(os.environ.get("STAR7_ROOT") or Path(__file__).resolve().parents[1])
OUT = BASE / "outputs" / "index.html"
RES = []


def chk(cid, desc, ok, measured):
    RES.append((cid, desc, bool(ok), measured))
    print(("PASS " if ok else "FAIL ") + cid + " " + desc + " | " + json.dumps(measured, ensure_ascii=False))


def new_page(browser, errs):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, locale="zh-CN")
    ctx.add_init_script("try{localStorage.clear()}catch(e){}")
    p = ctx.new_page()
    p.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
    p.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    p.goto(OUT.as_uri())
    p.wait_for_timeout(650)
    if p.locator('#guide [data-act="start-game"]').count():
        p.click('#guide [data-act="start-game"]')
        p.wait_for_timeout(800)
    p.evaluate("()=>{try{hideCoach()}catch(e){}}")
    return ctx, p


def state(p):
    return p.evaluate("""()=>({day:__game.state.day,money:__game.state.money,v:__game.state.v,
      unique:__game.uniqueCount(),shards:__game.state.shards})""")


def do_import(p, code):
    p.evaluate("()=>importSaveCode()")
    p.wait_for_timeout(220)
    p.fill('#saveCodeInput', code)
    p.click('#modalBack.show [data-act="apply-save-code"]')
    p.wait_for_timeout(420)
    if p.locator('#modalBack.show [data-act="confirm-import-save"]').count():
        p.click('#modalBack.show [data-act="confirm-import-save"]')
        p.wait_for_timeout(520)
    toast = p.evaluate("()=>document.querySelector('#toast').textContent")
    modal = p.evaluate("()=>{const m=document.querySelector('#modalBack.show');return m?m.textContent:''}")
    return toast, modal


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ① 生成一份「v5 合法导出码」作为底料（满卡 / 余额超上限 / 第 12 天）
    errs = []
    c, p = new_page(browser, errs)
    code5 = p.evaluate("""()=>{const s=__game.state;
      s.day=12;s.money=1000000;s.shards=5000;
      s.cards={};s.dupes={};s.fresh={};
      __game.data.CARDS.forEach(c=>{s.cards[c.id]=1});
      s.stats=Object.assign({},s.stats,{pulls:10,income:500});
      __game.render();
      return __game.saveCode.encode(s);}""")
    chk("R0", "生成 v5 合法底料", "." in code5, {"len": len(code5), "tail": code5[-14:]})

    # ② 降级为 v4 无签名纯 base64
    v4code = p.evaluate("""(code)=>{const i=code.lastIndexOf('.');
      const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(0,i)))));
      o.v=4;
      return btoa(unescape(encodeURIComponent(JSON.stringify(o))));}""", code5)
    v4json = p.evaluate("""(code)=>JSON.parse(decodeURIComponent(escape(atob(code))))""", v4code)
    chk("R1", "降级码为纯 base64 / v=4 / 56 卡", "." not in v4code and v4json["v"] == 4
        and len(v4json["cards"]) == 56, {"hasDot": "." in v4code, "v": v4json["v"],
                                         "cards": len(v4json["cards"]), "money": v4json["money"]})
    c.close()

    # ③ 全新设备导入降级码：应被接受（BUG-13 复现点）
    errs2 = []
    c, p = new_page(browser, errs2)
    t, modal = do_import(p, v4code)
    s = state(p)
    chk("R2", "v4 无签名码被接受（money 收敛 600 / 56 卡全解锁）",
        s["day"] == 12 and s["money"] == 600 and s["unique"] == 56,
        {"state": s, "toast": t})
    chk("R2b", "v4 无签名码导入后有可见警告", "旧版兼容码：未签名，仅建议用于升级" in modal,
        {"modalHasWarn": "旧版兼容码：未签名，仅建议用于升级" in modal, "modalTail": modal[-80:]})

    # ④ normalizeSave 洗白后重新导出：得到带合法签名的 v5
    re = p.evaluate("""()=>{const code=__game.saveCode.encode(__game.state);
      const d=__game.saveCode.decode(code);
      const i=code.lastIndexOf('.');
      return{hasSig:i>=0,v:__game.state.v,sigOk:!d.err,decodedV:d.save?d.save.v:null,err:d.err};}""")
    chk("R3", "normalizeSave 洗成 v5 且再导出带合法签名", re["hasSig"] and re["v"] == 5
        and re["sigOk"] and re["decodedV"] == 5, re)

    # ⑤ 洗白后的 v5 码在第三台设备可正常导入（洗白闭环成立）
    clean = p.evaluate("()=>__game.saveCode.encode(__game.state)")
    c.close()
    errs3 = []
    errs4 = []
    c, p = new_page(browser, errs4)
    do_import(p, clean)
    s = state(p)
    chk("R4", "洗白后的 v5 码可跨设备导入", s["unique"] == 56 and s["money"] == 600, s)
    c.close()

    chk("R5", "复现过程无 pageerror", not (errs + errs2 + errs3 + errs4),
        (errs + errs2 + errs3 + errs4)[:3])
    browser.close()

bad = [r for r in RES if not r[2]]
print("\n==== REPRO PASS %d / FAIL %d ====" % (len(RES) - len(bad), len(bad)))
for r in bad:
    print("FAIL:", r[0], r[1], "|", r[3])
