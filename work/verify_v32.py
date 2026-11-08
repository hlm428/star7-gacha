# v3.2 十八项改动逐条自检（静态检查 + 浏览器行为检查）
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(r"D:\下载\star7-gacha")
OUT = BASE / "outputs" / "index.html"
HTML = OUT.read_text(encoding="utf-8")
FAIL = []
PASS = []

def chk(name, cond, detail=""):
    (PASS if cond else FAIL).append(name + ("" if cond else (" | " + str(detail))))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else ("  -> " + str(detail))))

# ---------- 静态检查 ----------
chk("15 viewport 去掉 maximum-scale", "maximum-scale" not in HTML)
chk("15 og:title", 'property="og:title"' in HTML)
chk("15 og:description", 'property="og:description"' in HTML)
chk("15 og:image = assets/sy_ssr.webp", 'property="og:image" content="assets/sy_ssr.webp"' in HTML)
chk("15 favicon", 'rel="icon"' in HTML)
chk("10 海报副标题 SEVEN STARS", "SEVEN STARS · ONE STAGE" in HTML and "SEVENTEEN STARS" not in HTML)
chk("16 删除 DAILY_EVENTS/maybeEvent", "DAILY_EVENTS" not in HTML and "maybeEvent" not in HTML)
chk("16 删除 applyEvent/showEvent", "function applyEvent" not in HTML and "function showEvent" not in HTML)
chk("16 删除 portraitSVG 及辅助", "portraitSVG" not in HTML and "eyeSVG" not in HTML and "hairBack" not in HTML)
chk("4 删除 exchangeRarity 按钮", "exchange-rarity" not in HTML and "function exchangeRarity" not in HTML)
chk("17 中期奖励不写 FIXED_EVENTS", "ev.reward" not in HTML)
chk("18 normalizeSave 清理 dupes/fresh",
    "Object.keys(s.dupes).forEach" in HTML and "Object.keys(s.fresh).forEach" in HTML)
chk("版本号 v5.0（单一常量）", 'content="v5.0"' in HTML and "VERSION: 'v5.0'" in HTML and "version: GAME.VERSION" in HTML)
chk("6 SSR 无 1.6 秒自动关闭", "}, 1600);" not in HTML)
chk("7 打字速度按 audio.duration", "a.duration" in HTML and "perChar" in HTML)
chk("12 卖出确认框", "confirm-sell-shards" in HTML and "sellRange" in HTML)
chk("13 还差 X", "还差 " in HTML and (("cost - state.shards" in HTML) or ("cost-state.shards" in HTML)))
chk("14 更多玩法常驻 ×", 'class="x sticky"' in HTML)

# ---------- 浏览器检查 ----------
def ok(name, cond, detail=""):
    chk(name, cond, detail)

errors = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, locale="zh-CN")
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(OUT.as_uri())
    page.wait_for_timeout(700)
    page.click('#guide [data-act="start-game"]')
    page.wait_for_timeout(1500)
    page.evaluate("()=>hideCoach()")

    def st():
        return page.evaluate("""()=>{const s=__game.state;return{day:s.day,money:s.money,shards:s.shards,
          unique:__game.uniqueCount(),ended:s.ended,pulls:s.stats.pulls,ssr:s.stats.ssr,free:s.freeSingles};}""")
    def overlays():
        return page.evaluate("""()=>({pack:document.querySelector('#packOverlay').classList.contains('show'),
          ssr:document.querySelector('#ssrOverlay').classList.contains('show'),
          modal:document.querySelector('#modalBack').classList.contains('show'),
          settle:document.querySelector('#settleOverlay').classList.contains('show')})""")
    def restart():
        page.evaluate("()=>__game.restart()")
        page.wait_for_timeout(500)
    def close_modal():
        if page.locator('#modalBack.show [data-act="close-modal"]').count():
            page.locator('#modalBack.show [data-act="close-modal"]').first.click()
            page.wait_for_timeout(250)
    def reveal_pack(n):
        page.wait_for_timeout(500)
        if page.locator('[data-act="tear-open"]:visible').count():
            page.click('[data-act="tear-open"]')
            page.wait_for_timeout(1100)
        if n > 1 and page.locator('[data-act="flip-all"]:visible').count():
            page.click('[data-act="flip-all"]')
            page.wait_for_timeout(800)
        else:
            for i in range(n):
                el = page.locator(f'[data-flip="{i}"]')
                if el.count():
                    el.first.click()
                    page.wait_for_timeout(300)
        page.wait_for_timeout(400)
    def drop_pack():
        if overlays()["ssr"]:
            page.evaluate("()=>document.querySelector('#ssrOverlay').click()")
            page.wait_for_timeout(400)
        if page.locator('[data-act="collect"]:visible').count():
            page.click('[data-act="collect"]')
            page.wait_for_timeout(600)

    # ---- 2. computeEnding 七种判定 ----
    cases = [
        ("emperor", 100, 5, 0, 500, 0, 2000),
        ("collector", 100, 0, 54, 500, 0, 2000),
        ("unlucky", 50, 0, 0, 500, 0, 2000),
        ("allround", 100, 4, 40, 500, 0, 2000),
        ("poor", 200, 3, 30, 50, 0, 2000),
        ("calm", 50, 2, 20, 500, 0, 600),
        ("normal", 100, 2, 10, 500, 0, 900),
    ]
    got = {}
    for name, pulls, ssr, u, money, x, spent in cases:
        got[name] = page.evaluate("""([pulls,ssr,u,money,spent])=>{
          const g=__game,s=g.state; s.stats.pulls=pulls; s.stats.ssr=ssr; s.stats.spent=spent; s.money=money;
          const ids=Object.keys(g.data.CARD_BY_ID).slice(0,u); s.cards={}; ids.forEach(id=>s.cards[id]=1);
          return g.computeEnding();}""", [pulls, ssr, u, money, spent])
    ok("2 computeEnding 七种判定", got == {n: n for n, *_ in cases}, got)
    restart()

    # ---- 3/4. 兑换价与规则表 ----
    rar = page.evaluate("()=>{const r=__game.data.RARITY_INFO;return{N:r.N.exchange,R:r.R.exchange,SR:r.SR.exchange,SSR:r.SSR.exchange};}")
    ok("3 兑换价 N10/R25/SR80/SSR150", rar == {"N": 10, "R": 25, "SR": 80, "SSR": 150}, rar)
    page.evaluate("()=>__game.openRules()")
    page.wait_for_timeout(350)
    cols = page.evaluate("()=>document.querySelectorAll('.rules-table th').length")
    exbtn = page.evaluate("()=>document.querySelectorAll('.rules-table [data-act=\"exchange-rarity\"]').length")
    ok("4 规则表仅 3 列且无按稀有度兑换", cols == 3 and exbtn == 0, (cols, exbtn))
    close_modal()

    # ---- 13. 碎片不足显示还差 X ----
    page.evaluate("()=>{__game.state.shards=0;__game.render();}")
    page.click('header [data-act="album"]')
    page.wait_for_timeout(500)
    page.locator('#albumGrid .gcard.locked').first.click()
    page.wait_for_timeout(350)
    txt = page.evaluate("()=>{const b=document.querySelector('#modalBack.show [data-act=\"exchange-buy\"]');return b?b.textContent.trim():'';}")
    ok("13 兑换按钮显示还差 X", txt.startswith("还差 ") and "碎片" in txt, txt)
    close_modal()
    page.click('[data-act="close-album"]')
    page.wait_for_timeout(300)

    # ---- 12. 碎片卖出确认框 + 滑块 ----
    page.evaluate("()=>{__game.state.shards=200;__game.render();}")
    page.evaluate("()=>__game.openMarket()")
    page.wait_for_timeout(400)
    money_before = st()["money"]
    page.click('[data-act="sell-shards"]')
    page.wait_for_timeout(350)
    sell = page.evaluate("""()=>{const r=document.querySelector('#sellRange');
      return r?{max:+r.max,val:+r.value,qty:document.querySelector('#sellQty').textContent,
        gain:document.querySelector('#sellGain').textContent}:null;}""")
    ok("12 卖出默认保留 80（200→120）", sell and sell["max"] == 200 and sell["val"] == 120, sell)
    if sell:
        page.evaluate("""()=>{const r=document.querySelector('#sellRange');r.value=50;
          r.dispatchEvent(new Event('input',{bubbles:true}));}""")
        page.wait_for_timeout(200)
        sell2 = page.evaluate("""()=>({qty:document.querySelector('#sellQty').textContent,
          gain:document.querySelector('#sellGain').textContent,keep:document.querySelector('#sellKeep').textContent,
          dis:document.querySelector('#sellConfirm').disabled})""")
        ok("12 滑块联动金额", sell2["qty"] == "50" and "¥200" in sell2["gain"] and "150" in sell2["keep"], sell2)
        page.click('[data-act="confirm-sell-shards"]')
        page.wait_for_timeout(400)
        s = st()
        ok("12 确认卖出后碎片/生活费到账", s["shards"] == 150 and s["money"] >= money_before + 100, s)
    page.click('[data-act="close-market"]')
    page.wait_for_timeout(300)

    # ---- 9. 卡册语音切换 + 进度条 ----
    page.click('header [data-act="album"]')
    page.wait_for_timeout(500)
    page.click('.mtab[data-member="sy"] .pbtn')
    page.wait_for_timeout(350)
    page.click('#modalBack.show [data-act="voice-play"]')
    page.wait_for_timeout(900)
    v1 = page.evaluate("""()=>{const b=document.querySelector('#modalBack.show .voice-btn');
      return b?{on:b.classList.contains('vplaying'),bar:!!b.querySelector('.vbar'),
        w:b.querySelector('.vbar i').style.width}:null;}""")
    ok("9 语音播放中（按钮高亮 + 进度条）", v1 and v1["on"] and v1["bar"] and v1["w"].replace("%", "") not in ("", "0"), v1)
    page.click('#modalBack.show [data-act="voice-play"]')
    page.wait_for_timeout(300)
    v2 = page.evaluate("""()=>{const b=document.querySelector('#modalBack.show .voice-btn');
      return b?{on:b.classList.contains('vplaying'),w:b.querySelector('.vbar i').style.width}:null;}""")
    ok("9 再次点击停止播放", v2 and not v2["on"] and v2["w"] in ("0%", ""), v2)
    close_modal()
    page.click('[data-act="close-album"]')
    page.wait_for_timeout(300)

    # ---- 14. 更多玩法常驻 × ----
    page.click('[data-act="more"]')
    page.wait_for_timeout(400)
    more = page.evaluate("""()=>{const m=document.querySelector('#modalBack.show .modal');
      const x=document.querySelector('#modalBack.show .x.sticky');
      if(!m||!x) return null;
      m.scrollTop=m.scrollHeight;
      const mb=m.getBoundingClientRect(),xb=x.getBoundingClientRect();
      return {visible:xb.bottom>mb.top&&xb.top<mb.bottom,right:xb.right>mb.right-60};}""")
    ok("14 更多玩法 × 常驻右上角", more and more["visible"] and more["right"], more)
    close_modal()

    # ---- 11. 第 5 天两个分支 ----
    for choice, expect in (("stay", "shards"), ("rest", "money")):
        restart()
        # v5：把余额压低，避免生活费 + 选项奖励撞上 ¥600 上限导致断言抖动
        page.evaluate("()=>{__game.state.day=4;__game.setMoney(200);__game.render();}")
        before = st()
        page.click('[data-act="day"]')
        page.wait_for_timeout(900)
        first = page.evaluate("()=>document.querySelector('#modalBack.show .event-effect')?document.querySelector('#modalBack.show .event-effect').textContent:''")
        ok(f"11 {choice} 首个弹窗无「已到账」", "已到账" not in first, first)
        free0 = st()["free"]
        mid_before = st()   # 选项生效前的快照（已含当天生活费）
        page.click(f'[data-act="story-choice"][data-choice="{choice}"]')
        page.wait_for_timeout(400)
        after = st()
        eff = page.evaluate("()=>{const e=document.querySelector('#modalBack.show .event-effect');return e?e.textContent:'';}")
        if expect == "shards":
            ok("11 stay 碎片 +15", after["shards"] == mid_before["shards"] + 15, (mid_before, after))
            ok("11 stay 结果弹窗文案", "碎片 +15" in eff and "免费单抽" in eff, eff)
        else:
            ok("11 rest 生活费 +¥40", after["money"] == mid_before["money"] + 40, (mid_before, after))
            ok("11 rest 结果弹窗文案", "生活费 +¥40" in eff and "免费单抽" in eff, eff)
        ok("11 免费单抽两边都给", after["free"] >= 1 and free0 >= 1, (free0, after))
        close_modal()

    # ---- 17. 第 15 天中期奖励读 state ----
    restart()
    page.evaluate("()=>{__game.state.day=14;__game.render();}")
    page.click('[data-act="day"]')
    page.wait_for_timeout(900)
    mid = page.evaluate("""()=>{const e=document.querySelector('#modalBack.show .event-effect');
      const b=document.querySelector('#modalBack.show [data-act="midterm-claim"]');
      return {pending:__game.state.midtermPending,eff:e?e.textContent:'',
        amount:b?+b.dataset.amount:-1,reward:__game.dataExtra.FIXED_EVENTS[15].reward};}""")
    ok("17 中期奖励来自 state.midtermPending", mid["pending"] > 0 and mid["amount"] == mid["pending"]
       and str(mid["pending"]) in mid["eff"] and mid["reward"] is None, mid)
    page.click('#modalBack.show [data-act="midterm-claim"]')
    page.wait_for_timeout(350)
    ok("17 领取后 midtermPending 归零", page.evaluate("()=>__game.state.midtermPending") == 0)

    # ---- 1 + 5. 第 30 天不自动结算 / 结算 / 历史最高 / 二周目 ----
    restart()
    page.evaluate("()=>{__game.state.day=29;__game.setMoney(800);}")
    page.click('[data-act="day"]')
    page.wait_for_timeout(900)
    ov = overlays()
    s30 = st()
    hint = page.evaluate("()=>document.querySelector('#dayHint').textContent.trim()")
    ok("1 第 30 天不自动结算", s30["day"] == 30 and not s30["ended"] and not ov["settle"], (s30, ov))
    ok("1 dayHint = 结束旅程 · 去结算", hint == "结束旅程 · 去结算", hint)
    p0 = st()["pulls"]
    page.click('[data-act="pull1"]')
    reveal_pack(1)
    drop_pack()
    ok("1 第 30 天仍可抽卡", st()["pulls"] > p0, (p0, st()["pulls"]))
    page.click('[data-act="day"]')
    page.wait_for_timeout(800)
    ok("1 第 30 天点结算先出现二次确认",
       page.evaluate("""()=>!!document.querySelector('#modalBack.show [data-act="confirm-end"]')""" ))
    ok("1 二次确认前不锁定本局", (not st()["ended"]) and (not overlays()["settle"]),
       (st()["ended"], overlays()["settle"]))
    page.click('#modalBack.show [data-act="confirm-end"]')
    page.wait_for_timeout(800)
    ok("1 确认后进入结算", overlays()["settle"] and st()["ended"],
       (overlays()["settle"], st()["ended"]))
    lab = page.evaluate("()=>[...document.querySelectorAll('#scStats .sc-stat label')].map(e=>e.textContent)")
    ok("5 结算页显示历史最高", "历史最高" in lab and len(lab) == 10, lab)
    inc = page.evaluate("""()=>{
      const s=__game.state;
      const ems=[...document.querySelectorAll('#scStats .sc-income em')].map(e=>e.textContent);
      return {total:s.stats.income,daily:s.stats.incomeDaily,sell:s.stats.incomeSell,
        reward:s.stats.incomeReward,event:s.stats.incomeEvent,ems:ems};
    }""")
    ok("7 结算页收入四项分项展示",
       len(inc["ems"]) == 4 and any("每日生活费" in x for x in inc["ems"])
       and any("碎片寄卖" in x for x in inc["ems"]) and any("收集/考核" in x for x in inc["ems"])
       and any("事件/剧情" in x for x in inc["ems"]), inc)
    ok("7 收入分项合计 = 总收入",
       inc["daily"] + inc["sell"] + inc["reward"] + inc["event"] == inc["total"], inc)
    best = page.evaluate("()=>__game.state.best.unique")
    ucur = st()["unique"]
    ok("5 best 记录历史最高", best >= ucur, (best, ucur))
    page.click('#settleOverlay [data-act="close-settle"]')
    page.wait_for_timeout(600)
    ok("5 返回继续解除 ended 锁定", (not st()["ended"]) and (not overlays()["settle"]),
       (st()["ended"], overlays()["settle"]))
    page.evaluate("()=>__game.openSettlement()")
    page.wait_for_timeout(500)
    page.click('#settleOverlay [data-act="restart"]')
    page.wait_for_timeout(350)
    page.click('[data-act="confirm-restart"]')
    page.wait_for_timeout(700)
    s2 = page.evaluate("""()=>({day:__game.state.day,u:__game.uniqueCount(),cards:Object.keys(__game.state.cards).length,
      lines:Object.keys(__game.state.lines).length,claimed:Object.keys(__game.state.claimed).length,best:__game.state.best.unique})""")
    ok("5 二周目图鉴从 0 开始", s2["day"] == 1 and s2["u"] == 0 and s2["cards"] == 0, s2)
    ok("5 二周目台词/领取记录清空", s2["lines"] == 0 and s2["claimed"] == 0, s2)
    ok("5 历史最高保留", s2["best"] >= ucur, (s2["best"], ucur))

    # ---- 6. SSR 点击关闭，不 1.6 秒自动关闭 ----
    page.evaluate("()=>{__game.state.pityLeft=1;__game.setMoney(9999);}")
    page.click('[data-act="pull1"]')
    reveal_pack(1)
    is_ssr = overlays()["ssr"]
    if is_ssr:
        page.wait_for_timeout(2000)
        still = overlays()["ssr"]
        ok("6 SSR 2 秒后仍停留（无 1.6s 自动关闭）", still)
        page.evaluate("()=>document.querySelector('#ssrOverlay').click()")
        page.wait_for_timeout(400)
        ok("6 点击关闭 SSR", not overlays()["ssr"])
        drop_pack()
    else:
        ok("6 SSR 触发（pity=1）", False, "未出现 SSR 浮层")

    # ---- 8. 十连网格 padding / 下滑提示 ----
    restart()
    page.evaluate("()=>__game.setMoney(9999)")
    page.click('[data-act="pull10"]')
    reveal_pack(10)
    pad = page.evaluate("""()=>{const g=document.querySelector('#packGrid'),b=document.querySelector('#packBottomBar');
      return {pad:parseFloat(getComputedStyle(g).paddingBottom),bar:b.getBoundingClientRect().height};}""")
    ok("8 网格底部 padding = 按钮栏高度", abs(pad["pad"] - pad["bar"]) <= 2, pad)
    hint1 = page.evaluate("()=>{const h=document.querySelector('#packScrollHint');return{on:h.classList.contains('on'),txt:h.textContent};}")
    ok("8 末排不可见时提示下滑", hint1["on"] and "下滑还有" in hint1["txt"], hint1)
    page.evaluate("""()=>{const g=document.querySelector('#packGrid');g.scrollTop=g.scrollHeight;
      g.dispatchEvent(new Event('scroll'));}""")
    page.wait_for_timeout(300)
    hint2 = page.evaluate("()=>{const h=document.querySelector('#packScrollHint');return{on:h.classList.contains('on'),txt:h.textContent};}")
    ok("8 滑到底后提示消失", not hint2["on"], hint2)
    drop_pack()

    # ---- 15. viewport / head ----
    vp = page.evaluate("()=>document.querySelector('meta[name=viewport]').content")
    og = page.evaluate("""()=>({t:document.querySelector('meta[property="og:title"]').content,
      d:document.querySelector('meta[property="og:description"]').content,
      i:document.querySelector('meta[property="og:image"]').content,
      f:document.querySelector('link[rel=icon]').href})""")
    ok("15 viewport 无 maximum-scale", "maximum-scale" not in vp, vp)
    ok("15 og/favicon 生效", bool(og["t"] and og["d"] and og["i"].endswith("assets/sy_ssr.webp")) and og["f"], og)

    page.wait_for_timeout(200)
    browser.close()

ok("无 JS / console error", not errors, errors[:3])
print("\n==== PASS %d / FAIL %d ====" % (len(PASS), len(FAIL)))
if FAIL:
    for f in FAIL: print("FAIL:", f)
sys.exit(1 if FAIL else 0)
