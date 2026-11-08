# v5.0 P6 改动清单（2026-11-08）

本轮只做"存档签名版本门禁 / CHANGELOG / 单测与 CI"三项，不重做已完成的 P0/P1，不重构已修好的代码。
构建：`python work/build.py` → `outputs/index.html` 238,832 B（CRLF）/ 4,268 行（LF 等价 234,564 B）。
构建产物 MD5：`9C6A8A80636B7C212DDE3E2329D1B70E`（连续两次构建一致，确定性）；
原始 git blob：`a58bf1bbc3d8da2f82b9019010d389ea0e8c942a`。
基线：线上 main `767d4c4ff77ec39343425890761bec78d45492aa`（v5.0）。

## 一、存档签名可被剥离后缀绕过

根因：`decodeSaveCode()` 只在"有签名"时比对摘要，`. `后缀被剥离后 `sig` 为空，旧逻辑直接跳过校验；
同时 `GAME.SAVE_VER` 仍是 4，新旧码无法区分，纯 base64 伪造档可绕过后缀签名。

| 文件 / 函数 / 行号 | 行为变化 |
|---|---|
| `work/src/02_data.js` · `GAME.SAVE_VER` L215 | 4 → 5。导出的 `state.v` 由 `defaultState()`（`03a_core.js` L10）与 `normalizeSave()`（L146）统一写成 5，因此 `encodeSaveCode()` 输出的 JSON 必为 `v:5`。 |
| `work/src/02_data.js` · `GAME.VERSION` L217 | 新增唯一版本常量 `v5.0`，页面 meta 与 `__game.version` 不再各写一份。 |
| `work/src/03c_album.js` · `decodeSaveCode()` L441-459 | 解码后先读 `save.v`：`v >= 5` 且无签名 → 直接返回「存档码缺少签名（v5 起必须使用完整导出的存档码）」；有签名但摘要不符 → 仍返回「存档码校验失败（内容可能被修改）」；`v <= 4` 才允许无签名，兼容首轮 v2 / 第四轮 v4 老码。 |
| `work/src/03c_album.js` · `validateSavePayload()` L500-531 | 版本上限继续取 `GAME.SAVE_VER`（现为 5），即放行 `v <= 5`；结构、卡 ID、天数、金额、碎片、保底计数、空壳档校验全部保留。 |
| `work/src/03c_album.js` · `applySaveCode()` L557-594 | 流程不变：先解码验签，再结构校验，余额越界收敛到 `GAME.SAVE_CAP`（¥600）；本地有进度时仍弹覆盖确认，确认后 `commitImportSave()` 备份旧档并支持 `undoImportSave()` 撤销。 |
| `work/src/03c_album.js` · 注释 L426-429、规则页 L424 | 明确产品边界：客户端签名只能拦"随手改档"，算法公开、防不住有意伪造；真正防作弊需服务端校验。 |

说明（如实）：`v <= 4` 无签名仍可导入是需求指定的兼容策略。攻击者若把伪造档版本号改成 4 仍能导入，
但其生活费会被收敛到 ¥600；这是客户端校验的既定上限，不是本次遗漏。

## 二、CHANGELOG（v3.2 → v5.0）

| 文件 / 函数 / 行号 | 行为变化 |
|---|---|
| `work/src/03d_end.js` · `openRules()` L401-437 | 规则页新增「版本 v5.0 · 修订记录（v3.2 → v5.0）」可展开段落：v3.2 首轮 10 项缺陷（含存档强校验 / toast 队列 / 首屏图片 28 张 1.9MB → 1 张 74–81KB）、v4 第三轮阈值 21→20（u=20 落 ¥120）与收入四分项、v5.0 第四轮 P-01~P-07。 |
| `work/src/03c_album.js` · `openMore()` L378-392 | 「更多 / 玩法」新增「版本 v5.0」条目，指向规则页修订记录。 |
| `work/src/03f_init.js` · `init()` L171-175 | 初始化时把 `meta[name="version"]` 与 `__game.version` 统一写为 `GAME.VERSION`，避免两处漂移。 |
| `work/CHANGELOG.md` | 仓库内同步 v3.2 / v4 / v5.0 三段修订记录。 |

## 三、单测与 CI

| 文件 | 行为变化 |
|---|---|
| `work/regression_v5_gate.py`（新增） | 发布门禁 46 项：A 资金 11 组（含首局 vs 二周目）、B 存档 11 项（含 7 类注入）、C 10 万单抽 + 5,000 批十连、D 流程与 `aria-disabled`、E 性能与 320×568 / 360×780 / 390×844、F toast ≤1s、G 版本与 CHANGELOG、ALL 无 pageerror。输出 PASS/FAIL 表到 `work/v5-gate-report.md` 与 `work/v5-gate-results.json`，有失败时退出码 1。 |
| `.github/workflows/ci.yml`（新增） | `pull_request` 与 `push main` 触发；安装 Playwright → `python work/build.py` → `python work/regression_v5_gate.py` → Job Summary / PR 评论输出 PASS/FAIL → 上传报告与截图。失败即阻断合并。 |
| `work/verify_v32.py` L30 | 版本静态断言改为匹配"单一常量"实现（`VERSION: 'v5.0'` + `version: GAME.VERSION`），其余断言不动。 |

测量纪律（已固化在脚本里）：每个用例独立 browser context；`add_init_script` 在 `goto` 之前清 localStorage；
toast 用 `wait_for_function` 异步轮询；导入遇本地进度时点 `[data-act="confirm-import-save"]` 完成覆盖。

## 实测输出

### 全量回归 `python work/verify_v32.py`

```
==== PASS 60 / FAIL 0 ====
```

### 发布门禁 `python work/regression_v5_gate.py`

```
==== PASS 46 / FAIL 0 ====
```

关键实测：

| 用例 | 实测 |
|---|---|
| A1 ¥580 + ¥180 考核奖励 | money 600 / income +20 / reward +20 / toast「+¥20（溢出 ¥160 未入账）」 |
| A3a 旧档 ¥760 跨天 | money 760 / dayIncome 0（不再被削回 600） |
| A4 首局 vs 二周目 | 均为 money 500 / income 0 / dayIncome 0 / day 1，四项差值 0 |
| A6 4 局 × 30 天仿真 | identity / NaN / 负余额 / 超上限 全 0；4 局终值 money 591、income 154/174/165/185 |
| B1 合法签名 | decode 无错、JSON 全等、state.v=5 |
| B3 篡改 + 原签名 | 拒绝「校验失败（内容可能被修改）」 |
| B4 剥离签名（v5） | 拒绝「缺少签名（v5 起必须使用完整导出的存档码）」 |
| B5 残缺码 | 拒绝「格式无法识别」 |
| B6 / B7 v2 / v4 老码 | 分别导入成功：day5/¥250/图鉴1、day8/¥260/图鉴2 |
| B8 覆盖确认 / 撤销 | 确认后 day12/¥300；撤销后回到 day8/¥260/图鉴2 |
| B9 v5 纯 base64 伪造 | 拒绝，图鉴保持 2（不再刷到 56） |
| B10 自签伪造 | 按客户端边界收敛：money 600 / 图鉴 56（签名本身有效，见上方说明） |
| C1 10 万单抽 SSR | 2.842%（区间 2.7–3.0%） |
| C2 保底 | 最大间隔 59 ≤ 60；大保底违规 0；NaN 0 |
| C4 5,000 批十连 | 无 SR 批次 0 |
| C6 第 25 天第 20/21 抽 | 20 抽 SSR（前 20 实测 3.48%）→ 21 抽 SR（之后实测 2.13%） |
| D3b 结算锁定 | 抽卡 / 下一天 dim=true、`aria-disabled="true"`、ended=true |
| E2 320×568 | 保存图片按钮 top 419 / bottom 469 / vh 568，fixed，无横向溢出（top < 568） |
| E2 360×780 | 保存图片按钮 top 631 / bottom 681 / vh 780，fixed，无横向溢出 |
| F1 连发 4 条 toast | 712ms 显示最新 T4（≤1000ms） |
| G1 版本 | `__game.version` = meta = v5.0，SAVE_VER = 5 |

截图：`work/v5-shots/settle_320x568.png`、`work/v5-shots/settle_360x780.png`（按钮完整可见）。

## 约束保持声明

- `addMoney()` 仍是唯一入账口（`work/src/03a_core.js` L421-446），`SAVE_CAP=600` 未改。
- 抽卡概率常量、十连 SR 保底、60 抽保底、第 25 天加成均未改（C1-C6 实测与 v5 基线一致）。
- `window.__game` 测试钩子保留并继续暴露 `saveCode` / `state` / `data`。
- v2 / v4 存档兼容、单文件内联、零第三方运行依赖均保持。
- **核心玩法与资金记账无回归**：全量回归 60/60、发布门禁 46/46，A6 四局 30 天账本恒等违规 0。

## 推送与线上

- 推送方式沿用既定 `gh api` Git Trees 单提交（令牌只由 `gh` 读取，不写入任何文件）。
- 远端 main：`20b902eab1a88c30942ab1ff208f036399040829`（父提交 `767d4c4…`）。
- Pages 构建：`built`，commit `20b902e`。
- 线上 `https://hlm428.github.io/star7-gacha/` 下载实测 238,832 B / MD5 `9C6A8A80636B7C212DDE3E2329D1B70E`，与本地 `outputs/index.html` **逐字节一致**；远端 `index.html` blob `a58bf1b…` 与本地原始字节 blob 相同。

## 未完成 / 环境限制

- **CI 工作流文件未能推送到远端**：本机 `gh` 令牌 scope 为 `gist, read:org, repo`，不含 `workflow`。
  创建含 `.github/workflows/ci.yml` 的 Git Tree 时返回原文：`gh: Not Found (HTTP 404)`（GitHub 对缺 scope 的
  workflow 写入固定返回 404）。`work/push_v31.py` 已改为检测该情形：跳过工作流文件并照常推送其余 16 个文件。
  其余三项改动与全部测试均已落盘、提交并上线；只是「CI 作为合并门禁」尚未在 GitHub 上生效。
  解除方式（需用户本人授权）：`gh auth refresh -s workflow` 后重跑 `python work/push_v31.py`，
  或直接在网页端添加 `.github/workflows/ci.yml`（文件已在本地提交 `923a4d2`）。
