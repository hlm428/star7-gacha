# P9 · O-20：把门禁 PASS/FAIL 摘要写进仓库公开文档 docs/gates/
# P10 · O-21：补新鲜度头（源码指纹）+ 无结果时写 STALE 并退出非 0
# 供 CI 在门禁跑完后调用（if: always()），不改动任何现有断言。
#
# 幂等保证：公开文档只保留「源码指纹 / 编号 / 用例 / 期望 / 结果」，不写 run id、
# 时间戳、冷加载耗时等逐次波动值。指纹只由 work/src 与两个门禁脚本的内容决定，
# bot 的 docs 提交不会改变它，因此结论不变时文件逐字节一致、diff 为空、不产生
# 新提交，不会出现「提交 → 部署 → 再提交」的自激循环。
import argparse
import hashlib
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
outdir = BASE / "docs" / "gates"
outdir.mkdir(parents=True, exist_ok=True)
outdoc = outdir / a.out
outsum = outdir / (a.out[:-3] + "-summary.json")

clean = lambda s: str(s).replace("|", "\\|").replace("\n", " ").strip()


def source_fingerprint():
    """work/src + 两个门禁脚本的内容指纹；与 git 历史、bot docs 提交无关。
    按 LF 归一化后再哈希：本地 Windows（CRLF 检出）与 CI Linux（LF）必须得到同一个指纹。"""
    h = hashlib.sha256()
    files = sorted((BASE / "work" / "src").glob("*"))
    files += [BASE / "work" / "regression_v5_gate.py", BASE / "work" / "online_gate.py"]
    for f in files:
        if f.is_file() and f.name != "__pycache__":
            h.update(f.name.encode("utf-8"))
            h.update(f.read_bytes().replace(b"\r\n", b"\n"))
    return h.hexdigest()[:12]


def product_version():
    m = re.search(r"VERSION:\s*'(v[^']+)'", (BASE / "work" / "src" / "02_data.js").read_text(encoding="utf-8"))
    return m.group(1) if m else "unknown"


def write_stale(reason):
    """没有拿到本次结果：清掉旧结论，写明 STALE，并以非 0 退出让该步骤可见失败。"""
    title = report.read_text(encoding="utf-8").splitlines()[0].lstrip("# ").strip() if report.is_file() else a.out
    text = "\n".join([
        "# " + title, "",
        "**状态：STALE · 未取得本次门禁结果**", "",
        "本次运行没有产出可用的门禁结论（" + reason + "）。",
        "为避免把上一次的 PASS 误当成当前版本通过，本文件已清除旧结论。",
        "", "请以本次 Actions run 的日志与 artifact 为准。", "",
        "**产品版本**：`" + product_version() + "`　**源码指纹**：`" + source_fingerprint() + "`", ""])
    outdoc.write_text(text, encoding="utf-8", newline="\n")
    outsum.write_text(json.dumps({"status": "STALE", "total": 0, "pass": 0, "fail": 0,
                                  "failed_ids": []}, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
                      encoding="utf-8", newline="\n")
    print("STALE：%s 未产出结果，已写入 docs/gates/%s 并标记陈旧" % (reason, a.out), file=sys.stderr)
    sys.exit(1)


if not report.is_file() or not results.is_file():
    write_stale("缺少 %s" % (" / ".join(str(f.relative_to(BASE)) for f in (report, results) if not f.is_file())))

# 标题取原报告首行（如「# v5 发布门禁报告（...）」），其余内容全部从结果 JSON 重建
title = report.read_text(encoding="utf-8").splitlines()[0].lstrip("# ").strip()
try:
    rows = json.loads(results.read_text(encoding="utf-8"))
except json.JSONDecodeError:
    write_stale("%s 不是合法 JSON" % results.relative_to(BASE))
if not rows:
    write_stale("%s 为空" % results.relative_to(BASE))

passed = sum(1 for r in rows if r["pass"])
failed = [r for r in rows if not r["pass"]]

lines = ["# " + title, "",
         "**PASS %d / FAIL %d**" % (passed, len(failed)), "",
         "**产品版本**：`" + product_version() + "`　**源码指纹**：`" + source_fingerprint() + "`", "",
         "指纹为 `work/src` 与两个门禁脚本内容的 sha256 前 12 位；指纹不变即说明判定针对同一份代码。",
         "", "| 编号 | 用例 | 期望 | 结果 |", "|---|---|---|---|"]
for r in rows:
    lines.append("| %s | %s | %s | %s |" % (
        clean(r["id"]), clean(r["desc"]), clean(r["expected"]),
        "PASS" if r["pass"] else "FAIL"))
text = "\n".join(lines) + "\n"

outdoc.write_text(text, encoding="utf-8", newline="\n")

# 结论索引：同样剔除实测值，只留失败清单，保证稳定
summary = {"total": len(rows), "pass": passed, "fail": len(failed),
           "failed_ids": [r["id"] for r in failed]}
outsum.write_text(
    json.dumps(summary, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8", newline="\n")

print("synced %s -> docs/gates/%s（PASS %d / FAIL %d）" % (a.report, a.out, passed, len(failed)))
