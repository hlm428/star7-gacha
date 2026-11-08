import os
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

html = head + body + "\n<script>\n" + "\n".join(scripts) + "\n</script>\n</body>\n</html>\n"
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
