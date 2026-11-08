# P2 发布门禁 A~F（v5.0）：资金记账 / 存档 / 抽卡 / 流程 / 性能布局 / 提示
# 测量纪律：每用例独立 browser context；goto 前经 add_init_script 清 localStorage；
#          账本断言覆盖 nextDay 之后；同一 page 不二次 goto 统计资源。
import sys, json, math, os, time, tempfile
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

BASE = Path(os.environ.get("STAR7_ROOT") or Path(__file__).resolve().parents[1])
OUT = BASE / "outputs" / "index.html"
SHOTS = BASE / "work" / "gate-shots"
SHOTS.mkdir(parents=True, exist_ok=True)
RES = []   # (id, desc, expected, measured, ok)

def chk(cid, desc, ok, expected, measured):
    RES.append((cid, desc, expected, measured, bool(ok)))
    print(("PASS " if ok else "FAIL ") + cid + " " + desc + " | 实测=" + str(measured))

def st(p):
    return p.evaluate("""()=>{const s=__game.state;return{money:s.money,day:s.day,dayIncome:s.dayIncome,
      income:s.stats.income,daily:s.stats.incomeDaily,sell:s.stats.incomeSell,reward:s.stats.incomeReward,
      event:s.stats.incomeEvent,ended:s.ended,unique:__game.uniqueCount()};}""")

def new_page(browser, w=390, h=844, errs=None):
    ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, locale="zh-CN")
    ctx.add_init_script("try{localStorage.clear()}catch(e){}")   # goto 之前清，保证首局
    p = ctx.new_page()
    p.on("pageerror", lambda e: (errs if errs is not None else []).append(str(e)))
    p.on("console", lambda m: (errs if errs is not None else []).append(m.text) if m.type == "error" else None)
    p.goto(OUT.as_uri())
    p.wait_for_timeout(650)
    return ctx, p

def start(p):
    if p.locator('#guide [data-act="start-game"]').count():
        p.click('#guide [data-act="start-game"]')
        p.wait_for_timeout(900)
    p.evaluate("()=>{try{hideCoach()}catch(e){}}")

def close_modal(p):
    if p.locator('#modalBack.show [data-act="close-modal"]').count():
        p.locator('#modalBack.show [data-act="close-modal"]').first.click()
        p.wait_for_timeout(200)

def toast_text(p):
    return p.evaluate("()=>document.querySelector('#toast').textContent")

def wait_toast(p, sub, timeout=3000):
    """toast 是队列且有最短展示时长：异步轮询等待，避免同步读到上一条。"""
    try:
        p.wait_for_function("s=>document.querySelector('#toast').textContent.includes(s)",
                            arg=sub, timeout=timeout)
    except Exception:
        pass
    return toast_text(p)

def do_import(p, code):
    p.evaluate("()=>importSaveCode()"); p.wait_for_timeout(220)
    p.fill('#saveCodeInput', code)
    p.click('#modalBack.show [data-act="apply-save-code"]'); p.wait_for_timeout(420)
    if p.locator('#modalBack.show [data-act="confirm-import-save"]').count():
        p.click('#modalBack.show [data-act="confirm-import-save"]'); p.wait_for_timeout(520)

def fill_cards(p, n):
    p.evaluate("""(n)=>{const s=__game.state;const ids=__game.data.CARDS.map(c=>c.id).slice(0,n);
      s.cards={};ids.forEach(id=>s.cards[id]=1);s.dupes={};s.fresh={};__game.render();}""", n)

def trigger_midterm(p, money, ncards):
    fill_cards(p, ncards)
    p.evaluate("""(m)=>{const s=__game.state;s.money=m;s.day=15;s.fixedDone={};s.midtermPending=0;
      __game.render();__game.triggerFixedEvent(15);}""", money)
    p.wait_for_timeout(750)

def close_ssr(p):
    if p.locator('#ssrOverlay.show').count():
        p.evaluate("()=>document.querySelector('#ssrOverlay').click()")
        p.wait_for_timeout(380)

def reveal_collect(p):
    p.wait_for_timeout(450)
    close_ssr(p)
    if p.locator('[data-act="tear-open"]:visible').count():
        p.click('[data-act="tear-open"]'); p.wait_for_timeout(950)
    close_ssr(p)
    if p.locator('[data-act="flip-all"]:visible').count():
        p.click('[data-act="flip-all"]'); p.wait_for_timeout(700)
    else:
        n = p.locator('[data-flip]:visible').count()
        for i in range(n):
            p.locator(f'[data-flip="{i}"]').first.click(); p.wait_for_timeout(180)
    close_ssr(p)
    if p.locator('[data-act="collect"]:visible').count():
        p.click('[data-act="collect"]'); p.wait_for_timeout(550)
    close_ssr(p)

with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ================= A1 ¥580 + ¥180 考核奖励 =================
    errs = []
    c, p = new_page(browser, errs=errs); start(p)
    trigger_midterm(p, 580, 36)
    mtxt = p.evaluate("()=>document.querySelector('#modalBack.show').textContent")
    p.click('#modalBack.show [data-act="midterm-claim"]'); p.wait_for_timeout(350)
    s = st(p); t = toast_text(p)
    chk("A1", "¥580+¥180 领考核奖励", s["money"] == 600 and s["income"] == 20 and s["reward"] == 20
        and "160" in t, "money600/income+20/reward+20/提示160", {**s, "toast": t})
    c.close()

    # ================= A2 ¥599 + ¥80 / ¥600 领奖 =================
    c, p = new_page(browser, errs=errs); start(p)
    trigger_midterm(p, 599, 0)
    p.click('#modalBack.show [data-act="midterm-claim"]'); p.wait_for_timeout(350)
    s = st(p); t1 = toast_text(p)
    chk("A2a", "¥599+¥80 → gained=1", s["money"] == 600 and s["income"] == 1 and s["reward"] == 1,
        "money600/income+1", {**s, "toast": t1})
    p.evaluate("""()=>{const s=__game.state;s.midtermPending=80;s.fixedDone={};__game.render();
      __game.triggerFixedEvent(15);}""")
    p.wait_for_timeout(750)
    p.click('#modalBack.show [data-act="midterm-claim"]'); p.wait_for_timeout(350)
    s2 = st(p); t2 = toast_text(p)
    chk("A2b", "¥600 领奖 → 无账面变化", s2["money"] == 600 and s2["income"] == 1 and s2["reward"] == 1
        and "80" in t2, "money600/income不变/提示80", {**s2, "toast": t2})
    c.close()

    # ================= A3 余额曾超 600 后 nextDay =================
    c, p = new_page(browser, errs=errs); start(p)
    p.evaluate("()=>{const s=__game.state;s.money=760;s.day=2;__game.render();}")
    p.evaluate("""()=>{const o=Math.random;Math.random=()=>0.99;__game.nextDay();Math.random=o;}""")
    p.wait_for_timeout(400); close_modal(p)
    s3 = st(p)
    chk("A3a", "余额 760 跨天不减", s3["money"] == 760 and s3["dayIncome"] == 0,
        "money760/dayIncome0", s3)
    p.evaluate("()=>{const s=__game.state;s.money=550;s.day=2;__game.render();}")
    p.evaluate("""()=>{const o=Math.random;Math.random=()=>0.99;__game.nextDay();Math.random=o;}""")
    p.wait_for_timeout(400); close_modal(p)
    s4 = st(p)
    chk("A3b", "余额 550 跨天 dayIncome==实际增量", s4["money"] == 600 and s4["dayIncome"] == 50,
        "money600/dayIncome50", s4)
    c.close()

    # ================= A4 首局 vs 二周目 =================
    c1, p1 = new_page(browser, errs=errs); start(p1); a4a = st(p1); c1.close()
    c2, p2 = new_page(browser, errs=errs); start(p2)
    p2.evaluate("()=>__game.restart()"); p2.wait_for_timeout(700); a4b = st(p2); c2.close()
    diff = {k: a4a[k] - a4b[k] for k in ("money", "income", "dayIncome", "day")}
    chk("A4", "首局 vs 二周目起始一致", all(v == 0 for v in diff.values()),
        "四项差值均为0", {"首局": {k: a4a[k] for k in ("money","income","dayIncome","day")},
                          "二周目": {k: a4b[k] for k in ("money","income","dayIncome","day")}, "差": diff})

    # ================= A5 四条非跨日入账路径 =================
    # 1) 卖碎片：¥580 + 200 碎片，默认卖 50 枚 = ¥200
    c, p = new_page(browser, errs=errs); start(p)
    p.evaluate("()=>{const s=__game.state;s.money=580;s.shards=200;__game.render();__game.openMarket();}")
    p.wait_for_timeout(350)
    p.click('[data-act="sell-shards"]'); p.wait_for_timeout(350)
    p.click('[data-act="confirm-sell-shards"]'); p.wait_for_timeout(450)
    s5 = st(p); t = toast_text(p)
    chk("A5a", "卖碎片不突破 600", s5["money"] == 600 and s5["sell"] == 20 and "460" in t,
        "money600/sell+20/提示溢出460", {**s5, "toast": t})
    # 2) 收集奖励：¥580 + ¥188
    p.evaluate("()=>{const s=__game.state;s.money=580;__game.fillMember('sy');__game.checkCollectRewards();}")
    p.wait_for_timeout(500)
    p.click('#modalBack.show [data-act="claim-reward"]'); p.wait_for_timeout(450)
    s6 = st(p); t = toast_text(p)
    chk("A5b", "收集奖励不突破 600", s6["money"] == 600 and s6["reward"] == 20 and "168" in t,
        "money600/reward+20/提示溢出168", {**s6, "toast": t})
    # 3) 小事件：¥530，强制当日生活费 45 + 留灯 ¥50
    p.evaluate("()=>{const s=__game.state;s.money=530;s.day=2;s.smallEvents=[];__game.render();}")
    p.evaluate("""()=>{const o=Math.random;Math.random=()=>0;__game.nextDay();Math.random=o;}""")
    p.wait_for_timeout(750)
    m = p.evaluate("()=>document.querySelector('#modalBack.show')?document.querySelector('#modalBack.show').textContent:''")
    s7 = st(p)
    chk("A5c", "小事件不突破 600", s7["money"] == 600 and s7["event"] == 25 and "溢出 ¥25" in m,
        "money600/event+25/弹窗溢出25", {**s7, "modal": m[-60:]})
    close_modal(p)
    # 4) setMoney 封顶
    p.evaluate("()=>__game.setMoney(700)"); p.wait_for_timeout(250)
    s8 = st(p)
    p.evaluate("()=>__game.setMoney(1000000)"); p.wait_for_timeout(250)
    s9 = st(p)
    chk("A5d", "setMoney 不突破 600", s8["money"] == 600 and s9["money"] == 600,
        "700→600 / 1,000,000→600", {"700": s8["money"], "1e6": s9["money"]})
    c.close()

    # ================= A6 4 局 × 30 天仿真 =================
    sim_errs = []
    c, p = new_page(browser, errs=sim_errs); start(p)
    rounds = []
    for rnd in range(4):
        if rnd > 0:
            p.evaluate("()=>__game.restart()"); p.wait_for_timeout(800)
        bad = {"identity": 0, "nan": 0, "neg": 0, "over": 0}
        for d in range(29):
            p.evaluate("()=>{try{hideCoach()}catch(e){};__game.nextDay();}")
            p.wait_for_timeout(560)
            if p.locator('#modalBack.show [data-act="midterm-claim"]').count():
                p.locator('#modalBack.show [data-act="midterm-claim"]').first.click(); p.wait_for_timeout(300)
            elif p.locator('#modalBack.show').count():
                close_modal(p)
            if d % 4 == 0 and not p.locator('#packOverlay.show').count():
                p.evaluate("()=>{if(!__game.lastPull && !__game.state.ended)__game.pull(1);}")
                reveal_collect(p)
            s = st(p)
            vals = [s["money"], s["income"], s["daily"], s["sell"], s["reward"], s["event"], s["dayIncome"]]
            if any(not isinstance(v, (int, float)) or (isinstance(v, float) and math.isnan(v)) for v in vals):
                bad["nan"] += 1
            if s["daily"] + s["sell"] + s["reward"] + s["event"] != s["income"]:
                bad["identity"] += 1
            if s["money"] < 0:
                bad["neg"] += 1
            if s["money"] > 600:
                bad["over"] += 1
        rounds.append({"round": rnd + 1, "final": st(p), "bad": bad})
        close_modal(p)
    agg = {k: sum(r["bad"][k] for r in rounds) for k in ("identity", "nan", "neg", "over")}
    chk("A6", "4 局 30 天仿真账本恒等", all(v == 0 for v in agg.values()) and not sim_errs,
        "identity/NaN/负余额/超上限=0；无 pageerror", {"汇总": agg,
        "各局终值": [{"局": r["round"], "day": r["final"]["day"], "money": r["final"]["money"],
                    "income": r["final"]["income"]} for r in rounds], "errors": sim_errs[:3]})
    c.close()

    # ================= B 存档 =================
    c, p = new_page(browser, errs=errs); start(p)
    p.evaluate("""()=>{const s=__game.state;s.day=7;s.money=321;s.shards=42;s.stats.income=123;
      const ids=__game.data.CARDS.map(c=>c.id).slice(0,5);ids.forEach(id=>s.cards[id]=1);__game.render();save();}""")
    rt = p.evaluate("""()=>{const code=__game.saveCode.encode(__game.state);
      const d=__game.saveCode.decode(code);const before=JSON.parse(JSON.stringify(__game.state));
      return{err:d.err,equal:JSON.stringify(d.save)===JSON.stringify(before),len:code.length,v:__game.state.v};}""")
    chk("B1", "合法签名 round-trip 字段全等", rt["err"] is None and rt["equal"] and rt["v"] == 5,
        "decode 无错 / JSON 全等 / v=5", rt)
    # B2 空壳 {"cards":{}} 被拒且不清空
    before = st(p)
    empty = p.evaluate("""()=>{const o={v:5,day:1,money:0,shards:0,cards:{},dupes:{},stats:{pulls:0,income:0}};
      return __game.saveCode.encode(o);}""")
    do_import(p, empty)
    t = wait_toast(p, "没有任何可导入的进度"); after = st(p)
    chk("B2", '{"cards":{}} 被拒且不清空', "没有任何可导入的进度" in t and after["unique"] == before["unique"]
        and after["day"] == before["day"], "拒绝提示 + 进度不变", {"toast": t, "unique": after["unique"], "day": after["day"]})
    close_modal(p)
    # B3 篡改内容 + 保留原签名 → 拒绝
    before = st(p)
    tampered = p.evaluate("""()=>{const code=__game.saveCode.encode(__game.state);const i=code.lastIndexOf('.');
      const sig=code.slice(i+1);const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(0,i)))));
      o.money=999999;
      return btoa(unescape(encodeURIComponent(JSON.stringify(o))))+'.'+sig;}""")
    do_import(p, tampered)
    t = wait_toast(p, "校验失败"); after = st(p)
    chk("B3", "篡改内容 + 原签名被拒", "校验失败" in t and after["money"] == before["money"],
        "校验失败 + 余额不变", {"toast": t, "money": after["money"]})
    close_modal(p)
    # B4 剥离签名（v5 纯 base64）→ 拒绝
    before = st(p)
    stripped = p.evaluate("()=>__game.saveCode.encode(__game.state).split('.')[0]")
    do_import(p, stripped)
    t = wait_toast(p, "缺少签名"); after = st(p)
    chk("B4", "剥离签名（v5）被拒", "缺少签名" in t and after["money"] == before["money"]
        and after["unique"] == before["unique"], "缺少签名 + 进度不变", {"toast": t, "money": after["money"]})
    close_modal(p)
    # B5 残缺码 → 拒绝
    before = st(p)
    broken = p.evaluate("()=>__game.saveCode.encode(__game.state).slice(0,18)")
    do_import(p, broken)
    t = wait_toast(p, "无法识别"); after = st(p)
    chk("B5", "残缺码被拒", "无法识别" in t and after["day"] == before["day"], "格式无法识别 + 进度不变",
        {"toast": t, "day": after["day"]})
    close_modal(p)
    # B6 v2 老码（无签名）仍可导入
    legacy2 = p.evaluate("""()=>{const cid=__game.data.CARDS[0].id;
      const o={v:2,day:5,money:250,shards:0,cards:{},dupes:{},stats:{pulls:3,income:0}};o.cards[cid]=1;
      return btoa(unescape(encodeURIComponent(JSON.stringify(o))));}""")
    do_import(p, legacy2)
    leg2 = st(p)
    chk("B6", "首轮 v2 老码仍可导入", leg2["day"] == 5 and leg2["money"] == 250 and leg2["unique"] == 1,
        "day5/money250/图鉴1", leg2)
    close_modal(p)
    # B7 v4 老码（无签名）仍可导入
    legacy4 = p.evaluate("""()=>{const ids=__game.data.CARDS.map(c=>c.id).slice(0,2);
      const o={v:4,day:8,money:260,shards:10,cards:{},dupes:{},stats:{pulls:4,income:0}};
      ids.forEach(id=>o.cards[id]=1);return btoa(unescape(encodeURIComponent(JSON.stringify(o))));}""")
    do_import(p, legacy4)
    leg4 = st(p)
    chk("B7", "v4 老码仍可导入", leg4["day"] == 8 and leg4["money"] == 260 and leg4["unique"] == 2,
        "day8/money260/图鉴2", leg4)
    close_modal(p)
    # B8 合法导入：覆盖确认 + 撤销恢复
    before = st(p)
    good = p.evaluate("""()=>{const base=JSON.parse(JSON.stringify(__game.state));
      base.day=12;base.money=300;base.cards={};base.dupes={};base.stats=Object.assign({},base.stats,{pulls:0,income:0});
      return __game.saveCode.encode(base);}""")
    do_import(p, good)
    imp = st(p)
    canundo = p.locator('#modalBack.show [data-act="undo-import-save"]').count() > 0
    chk("B8a", "合法档覆盖确认后生效", imp["day"] == 12 and imp["money"] == 300 and canundo,
        "day12/money300/有撤销", {**imp, "undoBtn": canundo})
    if canundo:
        p.click('#modalBack.show [data-act="undo-import-save"]'); p.wait_for_timeout(520)
    back = st(p)
    chk("B8b", "撤销导入恢复旧档", back["day"] == before["day"] and back["money"] == before["money"]
        and back["unique"] == before["unique"], "恢复到导入前",
        {"before": before, "after": back})
    close_modal(p)
    # B9 伪造档（v5 纯 base64，无签名）→ 被拒且进度不变
    before = st(p)
    forged_unsigned = p.evaluate("""()=>{const o={v:5,day:10,money:1000000,shards:5000,cards:{},dupes:{},
      stats:{pulls:1,income:0}};Object.keys(__game.data.CARD_BY_ID).forEach(id=>o.cards[id]=1);
      return btoa(unescape(encodeURIComponent(JSON.stringify(o))));}""")
    do_import(p, forged_unsigned)
    t = wait_toast(p, "缺少签名"); after = st(p)
    chk("B9", "纯 base64 伪造档（v5）被拒", "缺少签名" in t and after["unique"] == before["unique"],
        "缺少签名 + 图鉴不刷满", {"toast": t, "unique": after["unique"]})
    close_modal(p)
    # B10 自签伪造档：签名有效 → 只能收敛数值（客户端签名边界，非失败）
    forged_signed = p.evaluate("""()=>{const o={v:5,day:10,money:1000000,shards:5000,cards:{},dupes:{},
      stats:{pulls:1,income:0}};Object.keys(__game.data.CARD_BY_ID).forEach(id=>o.cards[id]=1);
      return __game.saveCode.encode(o);}""")
    do_import(p, forged_signed)
    fg = st(p)
    chk("B10", "自签伪造档：兼容边界内收敛", fg["money"] == 600 and fg["unique"] == 56,
        "money收敛600 / 图鉴56（已知客户端边界）", fg)
    close_modal(p)
    # B11 无效码可见提示
    do_import(p, 'not-a-save-code')
    t = wait_toast(p, "无法识别")
    chk("B11", "无效码有可见提示", ("无效" in t or "格式" in t) and t != "", "toast 含无效/格式", t)
    c.close()

    # ================= C 抽卡统计 =================
    c, p = new_page(browser, errs=errs); start(p)
    stats = p.evaluate("""()=>{
      const mul=(a)=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
        t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
      const upId='sy-7', gacha=__game.gacha;
      const rng=mul(20261108);
      let pity=60, upPity=false, ssr=0, up=0, gap=0, maxGap=0, viol=0, nan=0;
      for(let i=0;i<100000;i++){
        const r=gacha.rollOnePure({pityLeft:pity,todayPulls:0,boostDay:0,day:1,upPity:upPity,upId:upId},rng);
        const is=r.card.rarity==='SSR';
        if(!Number.isFinite(r.pityLeft)) nan++;
        if(is){ssr++;if(r.card.id===upId)up++;gap=0;}else{gap++;if(gap>maxGap)maxGap=gap;}
        if(upPity&&is&&r.card.id!==upId)viol++;
        pity=r.pityLeft;upPity=r.upPity;
      }
      let tp=60,tup=false,tssr=0,tupc=0,noSR=0,maxGapBatch=0;
      for(let b=0;b<5000;b++){
        const r=gacha.rollBatchPure({pityLeft:tp,todayPulls:0,boostDay:0,day:1,upPity:tup,upId:upId},10,rng);
        if(!r.cards.some(c=>c.rarity==='SR'||c.rarity==='SSR'))noSR++;
        r.cards.forEach(c=>{if(c.rarity==='SSR'){tssr++;if(c.id===upId)tupc++;}});
        tp=r.pityLeft;tup=r.upPity;
      }
      const f=v=>()=>v;
      const pre=gacha.rollOnePure({pityLeft:60,todayPulls:19,boostDay:25,day:25,upPity:false,upId},f(0.034)).card.rarity;
      const post=gacha.rollOnePure({pityLeft:60,todayPulls:20,boostDay:25,day:25,upPity:false,upId},f(0.034)).card.rarity;
      const base=gacha.rollOnePure({pityLeft:60,todayPulls:0,boostDay:0,day:1,upPity:false,upId},f(0.034)).card.rarity;
      const rate=(tpull)=>{const rr=mul(888);let s=0;for(let i=0;i<20000;i++){
        const x=gacha.rollOnePure({pityLeft:60,todayPulls:tpull,boostDay:25,day:25,upPity:false,upId},rr);
        if(x.card.rarity==='SSR')s++;}return s/20000;};
      return{ssrRate:ssr/100000,upShare:up/ssr,maxGap,viol,nan,batches:5000,tssr,
        tupShare:tssr?tupc/tssr:0,noSR,pre,post,base,preRate:rate(19),postRate:rate(20)};
    }""")
    chk("C1", "10万单抽 SSR 综合率 ∈[2.7%,3.0%]", 0.027 <= stats["ssrRate"] <= 0.030,
        "2.7–3.0%", round(stats["ssrRate"] * 100, 3))
    chk("C2", "单抽最大间隔 ≤60", stats["maxGap"] <= 60 and stats["viol"] == 0 and stats["nan"] == 0,
        "maxGap≤60 / 大保底违规0", {"maxGap": stats["maxGap"], "viol": stats["viol"], "nan": stats["nan"]})
    chk("C3", "UP 占比 ∈[63%,70%]", 0.63 <= stats["upShare"] <= 0.70, "63–70%", round(stats["upShare"] * 100, 2))
    chk("C4", "5000 批十连无 SR 批次=0", stats["noSR"] == 0, "0", stats["noSR"])
    chk("C5", "十连 SSR/UP 占比", 0.63 <= stats["tupShare"] <= 0.70, "UP 63–70%",
        {"ssr": stats["tssr"], "upShare": round(stats["tupShare"] * 100, 2)})
    chk("C6", "第25天第20/21抽 3.5%→2%", stats["pre"] == "SSR" and stats["post"] == "SR"
        and stats["base"] == "SR", "20抽SSR / 21抽SR / 平日SR",
        {"20抽": stats["pre"], "21抽": stats["post"], "平日": stats["base"],
         "前20实测": round(stats["preRate"] * 100, 2), "之后实测": round(stats["postRate"] * 100, 2)})
    c.close()

    # ================= D 流程 =================
    lines = {19: ("还早。但至少你没缺席。", 80), 20: ("进度不错，星轨已经亮了一半。", 120),
             36: ("……你比我想象中认真。", 180)}
    for u, (line, amt) in lines.items():
        c, p = new_page(browser, errs=errs); start(p)
        fill_cards(p, u)
        p.evaluate("()=>{const s=__game.state;s.day=14;s.fixedDone={};s.midtermPending=0;__game.render();__game.nextDay();}")
        p.wait_for_timeout(800)
        mtxt = p.evaluate("()=>document.querySelector('#modalBack.show')?document.querySelector('#modalBack.show').textContent:''")
        s = st(p)
        ok = s["day"] == 15 and ("¥" + str(amt)) in mtxt and ("¥" + str(amt) + "（待领取）") in mtxt
        chk("D1-" + str(u), "第15天 u=%d → ¥%d 且文案一致" % (u, amt), ok and line in mtxt,
            "¥%d / 教练文案一致" % amt, {"pending": p.evaluate("()=>__game.state.midtermPending"),
            "modal¥": ("¥" + str(amt)) in mtxt, "line": line in mtxt})
        c.close()

    # D2 第 25 天券跨天过期
    c, p = new_page(browser, errs=errs); start(p)
    p.evaluate("""()=>{const s=__game.state;s.day=25;s.freeTen=1;s.freeTenDay=25;s.fixedDone={25:1};
      s.boostDay=25;__game.render();__game.nextDay();}""")
    p.wait_for_timeout(250)
    t = toast_text(p); s = st(p)
    chk("D2", "第25天券跨天提示券已过期", "券已过期" in t and s["day"] == 26, "toast 含券已过期", {"toast": t, "day": s["day"]})
    close_modal(p)
    c.close()

    # D3 第 30 天二次确认 + 返回继续撤销
    c, p = new_page(browser, errs=errs); start(p)
    p.evaluate("()=>{const s=__game.state;s.day=30;__game.render();__game.nextDay();}")
    p.wait_for_timeout(450)
    mtxt = p.evaluate("()=>document.querySelector('#modalBack.show')?document.querySelector('#modalBack.show').textContent:''")
    ok30 = "暂时锁定" in mtxt and "返回继续" in mtxt and "确认结算" in mtxt
    p.click('#modalBack.show [data-act="close-modal"]'); p.wait_for_timeout(350)
    back = st(p)
    chk("D3a", "第30天二次确认文案 + 再玩一天", ok30 and back["ended"] == False and back["day"] == 30,
        "含暂时锁定/返回继续；取消后 ended=false", {"modal": ok30, "ended": back["ended"], "day": back["day"]})
    p.evaluate("()=>__game.nextDay()"); p.wait_for_timeout(400)
    p.click('#modalBack.show [data-act="confirm-end"]'); p.wait_for_timeout(650)
    lock = p.evaluate("""()=>{const a=document.querySelector('#pull1Btn'),b=document.querySelector('#pull10Btn');
      return{settle:document.querySelector('#settleOverlay').classList.contains('show'),
        d1:a.classList.contains('dim'),d10:b.classList.contains('dim'),
        a1:a.getAttribute('aria-disabled'),a10:b.getAttribute('aria-disabled'),ended:__game.state.ended};}""")
    chk("D3b", "结算后按钮置灰 + aria", lock["settle"] and lock["ended"] and lock["d1"] and lock["d10"]
        and lock["a1"] == "true" and lock["a10"] == "true", "dim + aria-disabled=true", lock)
    p.evaluate("()=>__game.pull(1)"); p.wait_for_timeout(300)
    t = toast_text(p)
    chk("D3c", "ended 后抽卡有明确提示", "本局已结算" in t, "toast 含本局已结算", t)
    p.click('#settleOverlay [data-act="close-settle"]'); p.wait_for_timeout(500)
    un = st(p)
    chk("D3d", "返回继续撤销锁定", un["ended"] == False and un["day"] == 30, "ended=false/day30", un)
    c.close()

    # ================= G 版本与 CHANGELOG =================
    c, p = new_page(browser, errs=errs); start(p)
    ver = p.evaluate("""()=>({hook:__game.version,meta:document.querySelector('meta[name="version"]').content,
      saveVer:__game.data.GAME.SAVE_VER})""")
    chk("G1", "版本号由单一常量输出", ver["hook"] == "v5.0" and ver["meta"] == "v5.0" and ver["saveVer"] == 5,
        "__game/meta=v5.0 / SAVE_VER=5", ver)
    p.evaluate("()=>__game.openRules()"); p.wait_for_timeout(400)
    rtxt = p.evaluate("()=>document.querySelector('#modalBack.show').textContent")
    okchangelog = ("修订记录" in rtxt and "v3.2" in rtxt and "v4" in rtxt and "v5.0" in rtxt
                   and "21→20" in rtxt and "v5.0" in rtxt)
    okboundary = "无法防住有意伪造" in rtxt and "服务端校验" in rtxt
    okconsts = ("¥19" in rtxt and "¥9" in rtxt and "¥169" in rtxt and "¥600" in rtxt and "¥45–70" in rtxt)
    chk("G2", "规则页 CHANGELOG / 防改档边界 / 常量文案", okchangelog and okboundary and okconsts,
        "v3.2→v5.0 / 客户端边界 / 价格上限来自 GAME", {"changelog": okchangelog, "boundary": okboundary, "consts": okconsts})
    p.evaluate("()=>__game.closeModal ? __game.closeModal() : document.querySelector('[data-act=\"close-modal\"]').click()")
    p.wait_for_timeout(250)
    p.evaluate("()=>openMore()"); p.wait_for_timeout(400)
    mtxt2 = p.evaluate("()=>document.querySelector('#modalBack.show').textContent")
    chk("G3", "更多玩法可看到版本与 CHANGELOG 入口", "版本 v5.0" in mtxt2 and "修订记录" in mtxt2,
        "含版本 v5.0 + 指向规则页", mtxt2[:80])
    c.close()

    # ================= E 性能与布局 =================
    loads = []
    for i in range(3):
        ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                                   is_mobile=True, has_touch=True, locale="zh-CN")
        ctx.add_init_script("try{localStorage.clear()}catch(e){}")
        p = ctx.new_page()
        reqs = []
        p.on("request", lambda r: reqs.append(r.url))
        p.goto(OUT.as_uri(), wait_until="load")
        p.wait_for_timeout(900)
        imgs = [u for u in reqs if any(ext in u.lower() for ext in (".webp", ".png", ".jpg", ".jpeg"))]
        loaded = p.evaluate("""()=>{const im=document.querySelector('#posterArt img');
          return im?{w:im.naturalWidth,src:im.getAttribute('src')}:null;}""")
        total = OUT.stat().st_size
        for u in imgs:
            up = unquote(urlparse(u).path)
            if up.startswith("/"): up = up[1:]
            try:
                total += Path(up).stat().st_size
            except Exception:
                pass
        loads.append({"imgs": len(imgs), "bytes": total,
                      "names": [Path(unquote(urlparse(u).path)).name for u in imgs], "poster": loaded})
        ctx.close()
    okE = all(l["imgs"] <= 4 and l["bytes"] <= 400 * 1024 for l in loads)
    chk("E1", "冷加载3次 首屏图片≤4 / 传输≤400KB", okE, "≤4图 / ≤400KB",
        [{"次": i + 1, "图": l["imgs"], "bytes": l["bytes"], "KB": round(l["bytes"] / 1024, 1),
          "names": l["names"], "海报": l["poster"]} for i, l in enumerate(loads)])

    # E2 320×568 / 390×844 / 360×780 保存按钮首屏可见
    for w, h, name in [(320, 568, "320x568"), (390, 844, "390x844"), (360, 780, "360x780")]:
        c, p = new_page(browser, w, h, errs=errs); start(p)
        p.evaluate("()=>{__game.state.day=30;__game.render();__game.openSettlement();}")
        p.wait_for_timeout(800)
        r = p.evaluate("""()=>{const b=document.querySelector('#saveImgBtn').getBoundingClientRect();
          return{top:Math.round(b.top),bottom:Math.round(b.bottom),vh:innerHeight,w:document.documentElement.scrollWidth,
            pos:getComputedStyle(document.querySelector('.settle-dock')).position};}""")
        vis = r["bottom"] <= r["vh"] and r["top"] >= 0
        chk("E2-" + name, name + " 保存图片按钮首屏可见", vis and r["w"] <= w,
            "按钮在首屏内 / 无横向溢出", r)
        try:
            p.screenshot(path=str(SHOTS / ("settle_" + name + ".png"),), full_page=False)
        except OSError as e:
            # 截图目录被占用 / 只读时不阻断断言与报告，仅提示
            print("WARN screenshot skipped:", name, e)
        c.close()

    # ================= F toast 最新优先 =================
    c, p = new_page(browser, errs=errs); start(p)
    p.wait_for_timeout(2600)
    ms = p.evaluate("""()=>new Promise(res=>{
      const el=document.querySelector('#toast');const t0=performance.now();
      const mo=new MutationObserver(()=>{if(el.textContent==='T4'){mo.disconnect();res(performance.now()-t0);}});
      mo.observe(el,{childList:true,characterData:true,subtree:true});
      toast('T1');toast('T2');toast('T3');toast('T4');
      setTimeout(()=>{mo.disconnect();res(null);},1600);
    })""")
    t = toast_text(p)
    chk("F1", "连发4条 toast 最新≤1s可见", ms is not None and ms <= 1000 and t == "T4",
        "≤1000ms 且显示 T4", {"ms": None if ms is None else round(ms), "toast": t})
    c.close()

    chk("ALL", "全流程无 pageerror", not errs, "0 error", errs[:5])
    browser.close()

fail = [r for r in RES if not r[4]]
print("\n==== PASS %d / FAIL %d ====" % (len(RES) - len(fail), len(fail)))
for r in fail:
    print("FAIL:", r[0], r[1], "|", r[3])

def write_robust(path, text):
    """Windows 下文件偶尔被杀软 / 看图工具短暂占用，重试并对失败路径改名，避免门禁因写盘失败而误报。"""
    for attempt in range(3):
        try:
            path.write_text(text, encoding="utf-8")
            return path
        except PermissionError:
            time.sleep(0.5)
    alt = Path(tempfile.gettempdir()) / "star7-shots" / path.name
    alt.parent.mkdir(parents=True, exist_ok=True)
    alt.write_text(text, encoding="utf-8")
    print("WARN write ->", alt)
    return alt

write_robust(BASE / "work" / "v5-gate-results.json", json.dumps(
    [{"id": r[0], "desc": r[1], "expected": r[2], "measured": r[3], "pass": r[4]} for r in RES],
    ensure_ascii=False, indent=1, default=str))
md = ["# v5 发布门禁报告（P2 A~F + P6 存档门禁）", "",
      f"**PASS {len(RES) - len(fail)} / FAIL {len(fail)}**", "",
      "| 编号 | 用例 | 期望 | 实测 | 结果 |", "|---|---|---|---|---|"]
for cid, desc, exp, mea, ok in RES:
    e = str(exp).replace("|", "\\|").replace("\n", " ")
    m = str(mea).replace("|", "\\|").replace("\n", " ")[:900]
    md.append(f"| {cid} | {desc} | {e} | {m} | {'PASS' if ok else 'FAIL'} |")
write_robust(BASE / "work" / "v5-gate-report.md", "\n".join(md) + "\n")
sys.exit(1 if fail else 0)
