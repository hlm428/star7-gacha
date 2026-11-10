import os
import re
import shutil
from pathlib import Path

base = Path(os.environ.get("STAR7_ROOT") or Path(__file__).resolve().parents[1])
src = base / "work" / "src"
assets = base / "assets"
outs = base / "outputs"
outs.mkdir(parents=True, exist_ok=True)

js = ["02_data.js", "02_svg.js", "03a_core.js", "03b_gacha.js",
      "03c_album.js", "03d_end.js", "03e_canvas.js", "03f_init.js"]

head = (src / "00_head.html").read_text(encoding="utf-8")
body = (src / "01_body.html").read_text(encoding="utf-8")
scripts = []
for name in js:
    scripts.append("/* ===== " + name + " ===== */\n" + (src / name).read_text(encoding="utf-8"))

# P9 · O-18：版本号单一常量在 GAME.VERSION（work/src/02_data.js），
# 构建时直接写进产物 <meta name="version">，与 __game.version 同源；
# 运行时 setAttribute 覆盖保留为兜底（03f_init.js）。
m = re.search(r"VERSION:\s*'(v\d+(?:\.\d+)*)'", scripts[0])
if not m:
    raise SystemExit("未在 work/src/02_data.js 中找到 VERSION 常量，构建中止")
version = m.group(1)

html = head + body + "\n<script>\n" + "\n".join(scripts) + "\n</script>\n</body>\n</html>\n"
# P10 · O-23：产物中的 meta 保持纯标签，构建说明只留在本文件里。
# 连同行尾注释一起替换，避免产物残留「此值仅为兜底」这类构建期说明。
html, n = re.subn(
    r'<meta name="version" content="[^"]*">(?:<!--.*?-->)?',
    '<meta name="version" content="' + version + '">',
    html, count=1)
if n != 1:
    raise SystemExit("产物中未找到 <meta name=\"version\">，构建中止")
meta_line = next(l for l in html.splitlines() if 'name="version"' in l)
expected_meta = '<meta name="version" content="' + version + '">'
if meta_line != expected_meta:
    raise SystemExit("产物 meta 不是纯标签：" + meta_line)

out = outs / "index.html"
out.write_text(html, encoding="utf-8")

# 本地预览按线上结构镜像一份 assets/
mirror = outs / "assets"
mirror.mkdir(parents=True, exist_ok=True)
for p in assets.glob("*.webp"):
    shutil.copy2(p, mirror / p.name)

# 语音 mp3 镜像到 outputs/assets/voice/
voice_src = assets / "voice"
voice_out = mirror / "voice"
voice_out.mkdir(parents=True, exist_ok=True)
voice_n = 0
if voice_src.is_dir():
    for p in voice_src.glob("*.mp3"):
        shutil.copy2(p, voice_out / p.name)
        voice_n += 1

missing = [p.name for p in assets.glob("*.webp") if not p.is_file()]
print("built", out, len(html.encode("utf-8")), "bytes", html.count("\n"), "lines")
print("assets", len(list(assets.glob("*.webp"))), "files, voice", voice_n, "mp3")
if missing:
    print("MISSING", missing)
