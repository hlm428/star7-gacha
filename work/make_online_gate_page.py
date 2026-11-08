# P8 · O-14：生成本地一键提交页（本机 gh 令牌无 workflow scope，故走网页新建文件页）
import json, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
yml = (ROOT / ".github" / "workflows" / "online-gate.yml").read_text(encoding="utf-8")
value = urllib.parse.quote(yml, safe="")
url = ("https://github.com/hlm428/star7-gacha/new/main?filename=.github%2Fworkflows%2Fonline-gate.yml"
       "&value=" + value)
(ROOT / "work" / "online_gate_new_file_url.txt").write_text(url + "\n", encoding="utf-8")

tpl = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>一键提交 STAR7 线上门禁 workflow</title>
<style>
  :root {{ --ink:#1b1230; --muted:#5d5473; --accent:#7b3ff2; --accent2:#ff7ac6; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin:0; padding:0; }}
  body {{ min-height:100vh; background:linear-gradient(160deg,#f7f2ff,#fff6ec); color:var(--ink);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif;
    font-size:19px; line-height:1.65; padding:calc(20px + env(safe-area-inset-top)) 16px calc(28px + env(safe-area-inset-bottom));
    display:flex; justify-content:center; }}
  main {{ width:100%; max-width:720px; background:rgba(255,255,255,.86); border:1px solid rgba(123,63,242,.14);
    border-radius:22px; box-shadow:0 18px 50px rgba(60,32,120,.12); padding:26px 20px 24px; }}
  h1 {{ font-size:1.45em; line-height:1.3; margin:0 0 8px; }}
  .sub {{ margin:0 0 22px; color:var(--muted); font-size:.95em; }}
  code {{ background:#f0e9ff; border-radius:6px; padding:2px 6px; font-size:.92em; word-break:break-all; }}
  .primary {{ display:flex; align-items:center; justify-content:center; width:100%; min-height:68px; padding:18px 16px;
    background:linear-gradient(135deg,var(--accent),var(--accent2)); color:#fff; font-size:1.22em; font-weight:800;
    text-align:center; text-decoration:none; border-radius:16px; box-shadow:0 10px 24px rgba(123,63,242,.32); }}
  .steps {{ margin:24px 0 20px; display:grid; gap:14px; }}
  .step {{ display:flex; gap:12px; align-items:flex-start; background:#faf7ff; border-radius:14px; padding:14px; }}
  .n {{ flex:0 0 34px; width:34px; height:34px; border-radius:50%; background:var(--accent); color:#fff;
    font-weight:800; display:flex; align-items:center; justify-content:center; }}
  .step b {{ display:block; font-size:1.02em; }}
  .step p {{ margin:2px 0 0; color:var(--muted); font-size:.92em; }}
  .secondary {{ width:100%; min-height:58px; padding:14px 16px; background:#fff; color:var(--accent);
    border:2px solid rgba(123,63,242,.38); border-radius:14px; font-size:1.08em; font-weight:700; cursor:pointer; }}
  .msg {{ min-height:26px; margin:10px 0 0; color:#1f8a5b; font-size:.95em; }}
  details {{ margin-top:18px; border-top:1px dashed rgba(91,72,140,.28); padding-top:14px; }}
  summary {{ cursor:pointer; color:var(--muted); font-size:.95em; }}
  textarea {{ width:100%; height:130px; margin-top:10px; padding:10px; border:1px solid rgba(91,72,140,.24);
    border-radius:10px; font-family:ui-monospace,Consolas,monospace; font-size:13px; line-height:1.5;
    color:var(--ink); background:#fff; resize:vertical; }}
  @media (min-width:560px) {{ body {{ padding-left:28px; padding-right:28px; font-size:20px; }} main {{ padding:34px 32px; }} }}
</style>
</head>
<body>
<main>
  <h1>提交 star7-online-gate workflow</h1>
  <p class="sub">本机 gh 令牌没有 workflow scope，所以这个文件需要你在网页上点一下提交。链接里文件名与全文已填好。</p>

  <a id="openBtn" class="primary" href="{url_html}" target="_blank" rel="noopener noreferrer">打开 GitHub 新建 online-gate.yml</a>

  <div class="steps">
    <div class="step"><span class="n">1</span><div><b>确认账号是 hlm428</b><p>页面右上角账号名应为 hlm428。</p></div></div>
    <div class="step"><span class="n">2</span><div><b>确认文件名与内容已自动填好</b><p>文件名 <code>.github/workflows/online-gate.yml</code>，内容是 star7-online-gate 工作流全文（workflow_run 触发）。</p></div></div>
    <div class="step"><span class="n">3</span><div><b>点绿色 Commit changes</b><p>提交到 main。下次 Pages 部署成功后会自动跑线上门禁；也可在 Actions 里手动 Run workflow。</p></div></div>
  </div>

  <button id="copyBtn" class="secondary" type="button">复制链接</button>
  <p id="copyMsg" class="msg" role="status" aria-live="polite"></p>

  <details>
    <summary>链接长度与原文（兜底复制）</summary>
    <p>预填链接长度：<b id="lenBox">计算中</b> 字符</p>
    <textarea id="urlBox" readonly spellcheck="false"></textarea>
  </details>
</main>
<script>
  var URL_TEXT = {url_js};
  var box = document.getElementById('urlBox');
  var msg = document.getElementById('copyMsg');
  document.getElementById('lenBox').textContent = String(URL_TEXT.length);
  box.value = URL_TEXT;
  function done(t) {{ msg.textContent = t; }}
  document.getElementById('copyBtn').addEventListener('click', function () {{
    function fallback() {{
      try {{ box.focus(); box.select(); box.setSelectionRange(0, URL_TEXT.length);
        var ok = document.execCommand('copy');
        done(ok ? '已复制（兼容模式）' : '链接已选中，请按 Ctrl+C 或长按复制');
      }} catch (e) {{ box.focus(); box.select(); done('链接已选中，请按 Ctrl+C 或长按复制'); }}
    }}
    if (navigator.clipboard && navigator.clipboard.writeText) {{
      navigator.clipboard.writeText(URL_TEXT).then(function () {{ done('已复制到剪贴板'); }}).catch(fallback);
    }} else {{ fallback(); }}
  }});
</script>
</body>
</html>
"""
html = tpl.format(url_html=url.replace("&", "&amp;"), url_js=json.dumps(url))
(ROOT / "work" / "一键提交OnlineGate.html").write_text(html, encoding="utf-8")
print("url_len=", len(url))
print("page=", ROOT / "work" / "一键提交OnlineGate.html")
