# v5.2 · P9 变更清单（2026-11-10）

> 范围：仅 P9 三项（O-18 / O-19 / O-20）。未改动任何现有门禁断言的判定逻辑，未触碰资金记账（addMoney 唯一入账 / SAVE_CAP）、抽卡常量与保底、SAVE_VER=5 与 v2/v4 老码兼容路径、未签名警告前移、`__game` 测试钩子。

## 一、O-18（P4）：构建期把 GAME.VERSION 写进产物 meta

| 文件 | 函数 / 位置 | 行为变化 |
|---|---|---|
| `work/build.py` | 主流程（拼接后、写盘前） | 新增：正则从 `02_data.js` 提取 `VERSION: 'vX.Y'`，`re.subn` 重写产物 `<meta name="version">`（仅 1 处）；提取或替换失败即 `SystemExit` 中止构建 |
| `work/src/00_head.html` | 第 7 行 meta | 静态值 `v5.0 → v5.2` 作为兜底，注释标明由 build.py 重写 |
| `work/src/03f_init.js` | `init()` 171-175 行 | **未改**：运行时 `setAttribute('content', GAME.VERSION)` 保留为兜底 |

断言：产物静态文本中 `meta content == __game.version == GAME.VERSION == 'v5.2'`（G1 实测 PASS）。

## 二、O-19（P4）：版本升 v5.2，CHANGELOG 拆条

| 文件 | 位置 | 行为变化 |
|---|---|---|
| `work/src/02_data.js` | `GAME.VERSION`（217 行） | `'v5.1' → 'v5.2'`；`SAVE_VER` 保持 5 不动 |
| `work/src/03d_end.js` | `openRules()` CHANGELOG（425-433 行） | 标题 `v3.2 → v5.2`；原合并的 v5.1 条目拆为两条——**v5.1**（BUG-13 边界声明、首局提示文案、W/H 门禁）；**v5.2**（BUG-14 警告前移、O-16 规则页风险声明、O-17 去重复 toast、O-15 closeModal 清理、O-14 线上门禁接 CI + P9 三项） |
| `work/src/03c_album.js` | `openMore()` 392 行 | 文案 `v3.2 → v5.1` → `v3.2 → v5.2` |
| `work/regression_v5_gate.py` | G1 / G2 / G3（445-464 行） | 断言值 `v5.1 → v5.2`；G2 的 okchangelog 增加 `"v5.2" in rtxt` |
| `work/online_gate.py` | O7（96-97 行）与报告标题（107 行） | 断言值与标题 `v5.1 → v5.2` |

断言：版本三处同源（G1）、CHANGELOG 五条齐全（G2）、更多玩法入口含 v5.2（G3）、SAVE_VER 仍为 5；B6/B7（v2/v4 老码）、H5/H7/H8（无签名兼容）全 PASS 无回退。

## 三、O-20（P4）：门禁摘要写进仓库公开文档

| 文件 | 位置 | 行为变化 |
|---|---|---|
| `work/sync_gate_docs.py` | 新增 | 从 results JSON 重建**稳定摘要**写入 `docs/gates/<name>.md`（仅「编号 / 用例 / 期望 / 结果」），并输出 `*-summary.json` 结论索引；剔除逐次波动的实测值（如 O6 冷加载耗时）与 run URL |
| `.github/workflows/ci.yml` | 「Sync gate report to docs/gates/」步骤 + `permissions` | main 分支 push 且 `always()` 时执行；先 `git add` 再 `git diff --cached --quiet` 判定，无变化即跳过（幂等），有变化才以 bot 身份提交 `docs(gates): sync v5 release gate report [skip ci]`；补 `contents: write`（原默认只读导致 403） |
| `.github/workflows/online-gate.yml` | 同名步骤 + `permissions` | 步骤同上（产物 `online-gate.md`）；`contents: read → write`（写回需要） |
| `docs/gates/README.md` | 新增 | 目录说明：两个报告的来源、同步时机、幂等约定 |

保留：job summary 与 PR 评论步骤原样未动；未放宽或删改任何现有断言。

**踩坑记录（两轮修复后定型）**：① 未 `git add` 就 `git diff`，untracked 文件恒判为无变化 → 改为先 add 再 `diff --cached`；② 原设计把 `run {url}` 与实测耗时写进公开文档，导致每次内容都变 → 提交即触发 Pages 部署 → 再触发线上门禁 → 再提交，形成自激循环（曾累积 91 个 bot 提交）。改为只保留判定结果后，连续两次同步 MD5 完全一致，归一化提交后的下一次门禁输出「docs/gates/ 无变化，跳过提交」，循环终止。

## 四、杂项

- `.gitignore`：补 `outputs/`、`work/gate-shots/`、`work/*-gate-report.md/json`、`work/online-gate-*`、`work/online-gate-report/results.json`、`_backup_cleanup_*/`（本地中间产物，CI 会重新生成）。
- `index.html`（Pages 入口）已由 `build.py` 重新构建同步，MD5 `720DAE3AF7011B195ECCF1345AA9EB7E`。

## 五、实测

- 本地 `python work/build.py`：built 238,027 B / 4,300 行，产物 meta = v5.2。
- 本地 `python work/regression_v5_gate.py`：**PASS 80 / FAIL 0**（含 G1 `hook/meta=v5.2 / SAVE_VER=5`、G2 CHANGELOG、G3 入口、H1–H10 签名矩阵、W1–W10 兼容警告、B6/B7 老码）。
- `sync_gate_docs.py`：本地连续两次同步 MD5 均为 `EC129453B57F76769059019F48768287`（确定性）；CI 第二次运行输出「docs/gates/ 无变化，跳过提交」，确认不会自激。
- CI（`da7a86c`）：`star7-gate` success；Pages 部署 success；`star7-online-gate` success，**PASS 8 / FAIL 0**（O1–O7 全绿，O7 线上版本 = meta = v5.2）。
- 线上站点 `https://hlm428.github.io/star7-gacha/` 已服务 `<meta name="version" content="v5.2">`。
- 发布后公开文档：`docs/gates/v5-gate.md`（PASS 80 / FAIL 0）、`docs/gates/online-gate.md`（PASS 8 / FAIL 0）及两个 `*-summary.json`。
