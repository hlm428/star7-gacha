# -*- coding: utf-8 -*-
# P8 · BUG-14 复现/验收：未签名警告是否出现在「决策点」而不是成功弹层
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parents[1] / "outputs" / "index.html"
RES = []
WARN = "这是未签名的旧版兼容码"


def chk(cid, desc, ok, measured):
    RES.append((cid, desc, bool(ok), measured))
    print(("PASS " if ok else "FAIL ") + cid + " " + desc + " | " + json.dumps(measured, ensure_ascii=False))


def new_page(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, locale="zh-CN")
    ctx.add_init_script("try{localStorage.clear()}catch(e){}")
    p = ctx.new_page()
    errs = []
    p.on("pageerror", lambda e: errs.append(str(e)))
    p.goto(OUT.as_uri())
    p.wait_for_timeout(600)
    if p.locator('#guide [data-act="start-game"]').count():
        p.click('#guide [data-act="start-game"]')
        p.wait_for_timeout(800)
    p.evaluate("()=>{try{hideCoach()}catch(e){}}")
    return ctx, p, errs


def code(p, v, day, money, cards, sig="none"):
    return p.evaluate("""(cfg)=>{
      const ids=__game.data.CARDS.map(c=>c.id).slice(0,cfg.cards);
      const o={v:cfg.v,day:cfg.day,money:cfg.money,shards:0,cards:{},dupes:{},stats:{pulls:3,income:0}};
      ids.forEach(id=>o.cards[id]=1);
      const body=btoa(unescape(encodeURIComponent(JSON.stringify(o))));
      if(cfg.sig==='none') return body;
      return body+'.'+saveDigest(JSON.stringify(o));
    }""", {"v": v, "day": day, "money": money, "cards": cards, "sig": sig})


def open_import(p, c):
    p.evaluate("()=>importSaveCode()"); p.wait_for_timeout(220)
    p.fill('#saveCodeInput', c)
    p.click('#modalBack.show [data-act="apply-save-code"]'); p.wait_for_timeout(400)
    return p.evaluate("()=>{const m=document.querySelector('#modalBack.show');return m?m.textContent:''}")


def st(p):
    return p.evaluate("()=>({day:__game.state.day,money:__game.state.money,unique:__game.uniqueCount()})")


def toast_visible(p, dur=1500):
    return p.evaluate("""(dur)=>new Promise(res=>{const el=document.querySelector('#toast');
      const t0=performance.now();const seen=[];
      const tick=()=>{const cs=getComputedStyle(el);
        seen.push({t:Math.round(performance.now()-t0),cls:el.className,op:cs.opacity,txt:el.textContent});};
      const iv=setInterval(tick,200);tick();
      setTimeout(()=>{clearInterval(iv);res(seen);},dur);})""", dur)


with sync_playwright() as pw:
    b = pw.chromium.launch()

    # ① 有本地进度：覆盖确认弹层必须含未签名提示（BUG-14 核心）
    c1, p1, e1 = new_page(b)
    p1.evaluate("""()=>{const s=__game.state;s.day=7;s.money=111;s.cards={};s.dupes={};
      __game.data.CARDS.slice(0,2).forEach(c=>s.cards[c.id]=1);__game.render();}""")
    v4 = code(p1, 4, 12, 1000000, 56)
    md = open_import(p1, v4)
    chk("P8-1", "覆盖确认弹层含未签名提示（BUG-14 修复点）", WARN in md and "覆盖当前进度" in md,
        {"warnInConfirm": WARN in md, "confirmShown": "覆盖当前进度" in md})
    before = st(p1)
    chk("P8-2", "确认前状态未被写入", before["day"] == 7 and before["unique"] == 2, before)
    p1.click('#modalBack.show [data-act="confirm-import-save"]'); p1.wait_for_timeout(500)
    after = st(p1)
    smd = p1.evaluate("()=>{const m=document.querySelector('#modalBack.show');return m?m.textContent:''}")
    chk("P8-3", "确认后导入成功且成功弹层二次警告", after["day"] == 12 and after["money"] == 600
        and after["unique"] == 56 and "旧版兼容码：未签名" in smd, {"state": after, "warnInModal": "旧版兼容码：未签名" in smd})
    # O-17：关掉成功弹层后不应再有重复 warn toast
    p1.click('#modalBack.show [data-act="close-modal"]'); p1.wait_for_timeout(120)
    seen = toast_visible(p1, 1500)
    warn_seen = [x for x in seen if "warn" in x["cls"] and float(x["op"]) > 0.05]
    chk("P8-4", "O-17 成功弹层后无重复 warn toast", not warn_seen, {"warnSamples": warn_seen[:3]})
    c1.close()

    # ② 无本地进度：写入前必须有可见提示，且确认前不写入
    c2, p2, e2 = new_page(b)
    v4b = code(p2, 4, 9, 4000, 5)
    md2 = open_import(p2, v4b)
    chk("P8-5", "无本地进度导入未签名码先弹确认（写前提示）", WARN in md2 and "导入未签名兼容码" in md2,
        {"warn": WARN in md2, "modalShown": "导入未签名兼容码" in md2, "state": st(p2)})
    chk("P8-6", "提示阶段仍未写入状态", st(p2)["day"] == 1 and st(p2)["unique"] == 0, st(p2))
    p2.click('#modalBack.show [data-act="confirm-import-save"]'); p2.wait_for_timeout(500)
    chk("P8-7", "确认后导入成功", st(p2)["day"] == 9 and st(p2)["unique"] == 5, st(p2))
    c2.close()

    # ③ v5 合法签名码不得误报
    c3, p3, e3 = new_page(b)
    p3.evaluate("""()=>{const s=__game.state;s.day=4;s.money=222;s.cards={};s.dupes={};
      __game.data.CARDS.slice(0,1).forEach(c=>s.cards[c.id]=1);__game.render();}""")
    v5 = code(p3, 5, 8, 300, 3, sig="valid")
    md3 = open_import(p3, v5)
    chk("P8-8", "v5 合法签名码确认弹层不误报", "覆盖当前进度" in md3 and WARN not in md3,
        {"confirmShown": "覆盖当前进度" in md3, "warn": WARN in md3})
    c3.close()

    # ④ O-15：取消后 pendingImport 清零，再导入合法码不误报
    c4, p4, e4 = new_page(b)
    p4.evaluate("""()=>{const s=__game.state;s.day=7;s.money=111;s.cards={};s.dupes={};
      __game.data.CARDS.slice(0,2).forEach(c=>s.cards[c.id]=1);__game.render();}""")
    v4c = code(p4, 4, 6, 1000, 2)
    open_import(p4, v4c)
    p4.click('#modalBack.show [data-act="close-modal"]'); p4.wait_for_timeout(250)
    pending = p4.evaluate("()=>({p:pendingImport===null,u:pendingImportUnsigned})")
    chk("P8-9", "O-15 取消后 pendingImport 已清零", pending["p"] and pending["u"] is False, pending)
    v5b = code(p4, 5, 5, 200, 2, sig="valid")
    md4 = open_import(p4, v5b)
    chk("P8-10", "O-15 取消后再导入合法码不误报", "覆盖当前进度" in md4 and WARN not in md4,
        {"confirmShown": "覆盖当前进度" in md4, "warn": WARN in md4})
    c4.close()

    chk("P8-11", "全程无 pageerror", not (e1 + e2 + e3 + e4), (e1 + e2 + e3 + e4)[:3])
    b.close()

bad = [r for r in RES if not r[2]]
print("\n==== P8 REPRO PASS %d / FAIL %d ====" % (len(RES) - len(bad), len(bad)))
for r in bad:
    print("FAIL:", r[0], r[1], "|", r[3])
