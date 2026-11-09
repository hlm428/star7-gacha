# P7 · 线上环境门禁：只在部署后运行，直接打真实 URL（file:// 本地资源缺失不参与）
# 断言：console error=0 / pageerror=0 / 0 个 4xx-5xx / 28 张 webp 真实解码 / 42 个 mp3 可达且 MIME 正确 / 冷加载不超基线
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
URL = "https://hlm428.github.io/star7-gacha/"
# 冷加载基线：v5.0 线上 HTML 238,832 B + 首屏 ≤4 张 webp（≤400KB）已实测；
# v5.1 允许 HTML 增长，故总传输上限抬到 420KB，DCL 6s / load 8s 兜网络抖动。
COLD_MAX_BYTES = 420 * 1024
COLD_MAX_DCL = 6000
COLD_MAX_LOAD = 8000
RES = []


def chk(cid, desc, ok, expected, measured):
    RES.append((cid, desc, str(expected), measured, bool(ok)))
    print(("PASS " if ok else "FAIL ") + cid + " " + desc + " | 实测=" + json.dumps(measured, ensure_ascii=False))

def get_retry(ctx, url, attempts=3):
    """GitHub Pages CDN 偶发 503：同一 URL 重试，最多 3 次。"""
    r = None
    for i in range(attempts):
        r = ctx.request.get(url)
        if r.status < 500:
            return r
        time.sleep(1.2 * (i + 1))
    return r


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2,
                              is_mobile=True, has_touch=True, locale="zh-CN")
    ctx.add_init_script("try{localStorage.clear()}catch(e){}")
    p = ctx.new_page()
    errs, pageerrs, bad = [], [], []
    p.on("pageerror", lambda e: pageerrs.append(str(e)))
    p.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    p.on("response", lambda r: bad.append({"status": r.status, "url": r.url})
         if 400 <= r.status < 600 else None)

    p.goto(URL, wait_until="load")
    p.wait_for_timeout(1500)

    chk("O1", "线上 console error=0", len(errs) == 0, "0", errs[:5])
    chk("O2", "线上 pageerror=0", len(pageerrs) == 0, "0", pageerrs[:5])
    chk("O3", "线上 4xx/5xx 响应=0", len(bad) == 0, "0", bad[:5])

    perf = p.evaluate("""()=>{const n=performance.getEntriesByType('navigation')[0]||{};
      const rs=performance.getEntriesByType('resource');
      const bytes=rs.reduce((a,r)=>a+(r.transferSize||0),0)+((n.transferSize)||0);
      return{dcl:Math.round(n.domContentLoadedEventEnd||0),load:Math.round(n.loadEventEnd||0),
        bytes:bytes,res:rs.length,version:window.__game&&__game.version,
        meta:document.querySelector('meta[name="version"]')&&document.querySelector('meta[name="version"]').content};}""")
    chk("O6", "冷加载不超过基线", perf["dcl"] <= COLD_MAX_DCL and perf["load"] <= COLD_MAX_LOAD
        and perf["bytes"] <= COLD_MAX_BYTES,
        "DCL≤%dms / load≤%dms / ≤%dKB" % (COLD_MAX_DCL, COLD_MAX_LOAD, COLD_MAX_BYTES // 1024),
        {**perf, "KB": round(perf["bytes"] / 1024, 1)})

    webps = sorted((BASE / "assets").glob("*.webp"))
    mp3s = sorted((BASE / "assets" / "voice").glob("*.mp3"))
    chk("O4a", "本地资产清单完整", len(webps) == 28 and len(mp3s) == 42,
        "webp28 / mp3:42", {"webp": len(webps), "mp3": len(mp3s)})

    webp_ok, webp_bad = 0, []
    for f in webps:
        u = URL + "assets/" + f.name
        r = get_retry(ctx, u)
        dec = 0
        if r.ok:
            dec = p.evaluate("""(u)=>new Promise(res=>{const im=new Image();
              im.onload=()=>res(im.naturalWidth>0?im.naturalWidth:0);
              im.onerror=()=>res(0);im.src=u;setTimeout(()=>res(0),8000);})""", u)
        if r.ok and dec:
            webp_ok += 1
        else:
            webp_bad.append({"file": f.name, "status": r.status, "w": dec})
    chk("O4", "28 张 webp 真实解码成功", webp_ok == 28 and not webp_bad, "28/28",
        {"ok": webp_ok, "bad": webp_bad[:3]})

    mp3_ok, mp3_bad = 0, []
    # GitHub Pages 对 .mp3 返回 audio/mp3；audio/mpeg 同为合法 MIME，两者都算「正确」
    OK_MP3_TYPES = ("audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg-3")
    for f in mp3s:
        r = get_retry(ctx, URL + "assets/voice/" + f.name)
        ctype = (r.headers.get("content-type") or "").lower()
        if r.ok and any(t in ctype for t in OK_MP3_TYPES):
            mp3_ok += 1
        else:
            mp3_bad.append({"file": f.name, "status": r.status, "type": ctype})
    chk("O5", "42 个 mp3 可达且 MIME 正确", mp3_ok == 42 and not mp3_bad, "42/42 audio/mpeg|audio/mp3",
        {"ok": mp3_ok, "bad": mp3_bad[:3]})

    chk("O7", "线上版本与 meta 一致为 v5.2", perf["version"] == "v5.2" and perf["meta"] == "v5.2",
        "v5.2 / v5.2", {"hook": perf["version"], "meta": perf["meta"]})

    ctx.close()
    browser.close()

fail = [r for r in RES if not r[4]]
print("\n==== ONLINE PASS %d / FAIL %d ====" % (len(RES) - len(fail), len(fail)))
for r in fail:
    print("FAIL:", r[0], r[1], "|", r[3])

lines = ["# v5.2 线上环境门禁报告", "", f"**URL**：{URL}", "",
         f"**PASS {len(RES) - len(fail)} / FAIL {len(fail)}**", "",
         "| 编号 | 用例 | 期望 | 实测 | 结果 |", "|---|---|---|---|---|"]
for cid, desc, exp, mea, ok in RES:
    lines.append("| %s | %s | %s | %s | %s |" % (
        cid, desc, exp.replace("|", "\\|"),
        str(mea).replace("|", "\\|").replace("\n", " ")[:600], "PASS" if ok else "FAIL"))
(BASE / "work" / "online-gate-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
(BASE / "work" / "online-gate-results.json").write_text(json.dumps(
    [{"id": r[0], "desc": r[1], "expected": r[2], "measured": r[3], "pass": r[4]} for r in RES],
    ensure_ascii=False, indent=1, default=str), encoding="utf-8")
sys.exit(1 if fail else 0)
