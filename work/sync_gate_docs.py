# P9 · O-20：把门禁 PASS/FAIL 摘要写进仓库公开文档 docs/gates/
# 供 CI 在门禁跑完后调用（if: always()），不改动任何现有断言。
# 幂等保证：公开文档只保留「编号 / 用例 / 期望 / 结果」，剔除逐次波动的实测值
# （如冷加载耗时）与 run URL；门禁结论不变时文件内容逐字节一致，
# 写回步骤据 git diff 决定是否提交，不会出现「提交 → 部署 → 再提交」的自激循环。
import argparse
import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]

p = argparse.ArgumentParser(description="sync gate report into docs/gates/")
p.add_argument("--report", required=True, help="work 下的报告文件，如 work/v5-gate-report.md")
p.add_argument("--results", required=True, help="work 下的结果 JSON，如 work/v5-gate-results.json")
p.add_argument("--out", required=True, help="docs/gates/ 下的输出名，如 v5-gate.md / online-gate.md")
a = p.parse_args()

report = BASE / a.report
results = BASE / a.results
for f in (report, results):
    if not f.is_file():
        print("缺少 " + str(f) + "，跳过同步", file=sys.stderr)
        sys.exit(0)

# 标题取原报告首行（如「# v5 发布门禁报告（...）」），其余内容全部从结果 JSON 重建
title = report.read_text(encoding="utf-8").splitlines()[0].lstrip("# ").strip()
rows = json.loads(results.read_text(encoding="utf-8"))
if not rows:
    print("结果为空，跳过同步", file=sys.stderr)
    sys.exit(0)

passed = sum(1 for r in rows if r["pass"])
failed = [r for r in rows if not r["pass"]]
clean = lambda s: str(s).replace("|", "\\|").replace("\n", " ").strip()

lines = ["# " + title, "", "**PASS %d / FAIL %d**" % (passed, len(failed)), "",
         "| 编号 | 用例 | 期望 | 结果 |", "|---|---|---|---|"]
for r in rows:
    lines.append("| %s | %s | %s | %s |" % (
        clean(r["id"]), clean(r["desc"]), clean(r["expected"]),
        "PASS" if r["pass"] else "FAIL"))
text = "\n".join(lines) + "\n"

outdir = BASE / "docs" / "gates"
outdir.mkdir(parents=True, exist_ok=True)
(outdir / a.out).write_text(text, encoding="utf-8")

# 结论索引：同样剔除实测值，只留失败清单，保证稳定
summary = {"total": len(rows), "pass": passed, "fail": len(failed),
           "failed_ids": [r["id"] for r in failed]}
(outdir / (a.out[:-3] + "-summary.json")).write_text(
    json.dumps(summary, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")

print("synced %s -> docs/gates/%s（PASS %d / FAIL %d）" % (a.report, a.out, passed, len(failed)))
