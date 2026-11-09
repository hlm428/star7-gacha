# P9 · O-20：把门禁 PASS/FAIL 摘要写进仓库公开文档 docs/gates/
# 供 CI 在门禁跑完后调用（if: always()），不改动任何现有断言；报告无时间戳，
# 结果不变时文件内容逐字节一致（写回步骤据 git diff 决定是否提交，天然幂等）。
import argparse
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]

p = argparse.ArgumentParser(description="sync gate report into docs/gates/")
p.add_argument("--report", required=True, help="work 下的报告文件，如 work/v5-gate-report.md")
p.add_argument("--results", required=True, help="work 下的结果 JSON，如 work/v5-gate-results.json")
p.add_argument("--out", required=True, help="docs/gates/ 下的输出名，如 v5-gate.md / online-gate.md")
p.add_argument("--run-url", required=True, help="本次 Actions run 的 URL（写入页脚便于追溯）")
a = p.parse_args()

report = BASE / a.report
results = BASE / a.results
if not report.is_file():
    print("缺少 " + a.report + "，跳过同步", file=sys.stderr)
    sys.exit(0)

text = report.read_text(encoding="utf-8")

# 本次运行的 run URL 写进页脚；同步提交自身触发的 run 因内容相同被 diff 短路，不会循环。
footer = "\n---\n最近更新：CI 自动同步 · run " + a.run_url + "\n"
text = re.sub(r"\n?---\n最近更新：CI 自动同步[^\n]*\n?$", "", text.rstrip("\n")) + footer

outdir = BASE / "docs" / "gates"
outdir.mkdir(parents=True, exist_ok=True)
(outdir / a.out).write_text(text, encoding="utf-8")
if results.is_file():
    (outdir / (a.out[:-3] + "-results.json")).write_text(
        results.read_text(encoding="utf-8"), encoding="utf-8")
print("synced " + a.report + " -> docs/gates/" + a.out)
