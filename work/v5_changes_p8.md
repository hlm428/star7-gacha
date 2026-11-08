# v5.1（P8 收尾）改动清单 · 2026-11-09

> 范围：仅 P8 五项（BUG-14 / O-14 / O-15 / O-16 / O-17+断言固化）。未重构 addMoney 唯一入账、抽卡纯函数、存档强校验、toast 队列、断点 800px。
> 版本号按任务书要求**保持 v5.1**（「v5.1 版本号」在不要重构清单内），`GAME.VERSION` 单点、`meta[name=version]` / `__game.version` 同源，`GAME.SAVE_VER` 仍为 5。
> 产物：单文件内联 `outputs/index.html`，零第三方运行时依赖。

## 一、BUG-14（P3）：未签名警告前移到决策点

**改前（报告 13.6）**：`applySaveCode()` 置 `pendingImportUnsigned = unsigned && v<=4` 后，有本地进度只弹「覆盖当前进度？」确认，弹层内 `warnInConfirm=false`；红色警告要到 `commitImportSave()` 成功弹层才出现，玩家在决策点完全不知道来源不可信。

**落地**

| 文件 | 位置 | 行为 |
|---|---|---|
| `work/src/03c_album.js` | `applySaveCode()` 覆盖确认弹层 | 「当前 / 导入」信息之后、按钮之前插入 `⚠️ 这是未签名的旧版兼容码，请确认来源可信`（`color:#b23c72` 加粗） |
| `work/src/03c_album.js` | `applySaveCode()` 无本地进度分支 | 新增写前确认弹层「导入未签名兼容码？」，含同一条警告 + 「未签名码无法验证来源与完整性；确认后将立即写入本机存档」，按钮「仍要导入 / 取消」；未确认不写入 |
| `work/src/03c_album.js` | `commitImportSave()` | 成功弹层保留二次警告；不再排队重复 warn toast（见 O-17） |

无本地进度时 `commitImportSave()` 不再直接执行：未签名码先弹确认，签名码仍直接导入（v5 合法码不误报）。

## 二、O-14（P3）：部署后环境门禁接入 CI

- 新增 `.github/workflows/online-gate.yml`（`star7-online-gate`）：
  - 触发：`workflow_run` → `pages build and deployment` → `completed`（仅 `conclusion == 'success'` 运行），另留 `workflow_dispatch` 手动入口；
  - 步骤：checkout → setup-python 3.11 → 安装 Playwright（测试依赖）→ `python work/online_gate.py` → PASS/FAIL 写入 `$GITHUB_STEP_SUMMARY` → 失败时追加显式 ❌ 行并 `exit 1`，run 直接标红 → 上传 `online-gate-report.md` / `online-gate-results.json`；
  - 未改动 `work/online_gate.py` 的 O1–O7 任何断言，也未改动 `.github/workflows/ci.yml`。
- 本机 `gh` 令牌无 `workflow` scope：**未**做 `gh auth refresh`、未起验证码、未用 API 硬推该文件。改走本地一键提交页：
  - `work/一键提交OnlineGate.html`（按钮直达 GitHub「新建文件」页，文件名与 YAML 全文已预填）
  - `work/online_gate_new_file_url.txt`（预填 URL 原文）
  - 生成脚本 `work/make_online_gate_page.py`

## 三、O-15（P4）：`closeModal()` 清理待导入状态

`work/src/03a_core.js` · `closeModal()` 增加 `clearPendingImport()`（`pendingImport = null; pendingImportUnsigned = false;`），函数声明提升避免 TDZ；「撤销导入」走 `GAME.SAVE_BACKUP_KEY` 独立路径，不受影响（B8b 仍绿）。

## 四、O-16（P4）：规则页措辞降级

`work/src/03d_end.js` 规则页「存」条目：

- 删掉可执行的改档步骤「把存档码 JSON 里的 `v` 改成 4 并去掉签名后缀」；
- 改为风险声明「**旧版无签名兼容码不受签名保护，请仅用于升级自己的老存档**」；
- 保留边界声明「签名算法在客户端公开，**无法防住有意伪造**。若需要真正防作弊，必须接服务端校验。」

## 五、O-17（P4）+ 断言固化

- `commitImportSave()` 删除成功弹层之后的 warn toast：弹层正文已可见警告，不再重复排队（实测改前弹层关闭后 `toast show warn` / opacity 1 仍可见约 2.6s）。
- `work/regression_v5_gate.py` 新增 K 段（W1–W10，走真实 UI 链路 `importSaveCode → apply-save-code → confirm-import-save`）：
  - W1 v5 合法签名：接受 / 决策点与成功弹层均不警告
  - W2 v4 降级无签名（满卡 / ¥1e6）：接受 / money 收敛 600 / 图鉴 56 / 两处均警告
  - W3 v2 真实老码无签名：接受 / 两处均警告
  - W4 v3 无签名：接受 / 两处均警告
  - W5 v4 错误签名：拒绝 / 进度不变
  - W6 v5 剥离签名：拒绝 / 进度不变
  - W9 v4 带合法签名：接受 / 不警告（判定依据是「无签名」而非版本号）
  - W10 有本地进度 + v4 无签名：**覆盖确认弹层内出现未签名提示**（BUG-14 验收，改前必 FAIL）
  - W7 状态机：同一页先无签名码再合法码，第二次不残留警告
  - W8 状态机：取消覆盖确认后再次导入合法码不误报
- G 组：G1 断言 `v5.1` + `SAVE_VER=5`；G2 规则页 5 项边界断言（含「无法防住有意伪造」「服务端校验」「旧版无签名兼容码不受签名保护」「请仅用于升级自己的老存档」，且不得出现「改成 4」「去掉签名后缀」）；G3 断言「版本 v5.1」「v3.2 → v5.1」。
- 原有 A–J 断言全部保留、未放宽。

## 六、最终验收

| 项 | 结果 |
|---|---|
| 构建 | `outputs/index.html` 241,908 B，MD5 `138CFD0CD4E25C97851FC18FB49FB1FD`，SHA256 `E5B3B289A7058F9C722A104E4EAA5B2F6F2B2FBA3F630A8FE7575DD6D76F2A0E`（P7 线上为 240,427 B / MD5 `17EDE13D…`） |
| 本地门禁 | `regression_v5_gate.py` **PASS 80 / FAIL 0**（原有 70 项 A–J 未回退 + 新增 W1–W10） |
| CI（star7-gate） | run [`42534874310`](https://github.com/hlm428/star7-gacha/actions/runs/42534874310)（commit `9f0b576`）**success**，6m27s |
| Pages | `pages build and deployment` run `42534874186` **success** |
| 线上逐字节 | 线上 241,908 B / SHA256 `E5B3B289…76F2A0E`，与本地 **完全一致** |
| 线上门禁 | `online_gate.py` **PASS 8 / FAIL 0**：console error 0 / pageerror 0 / 4xx-5xx 0 / 28 webp 解码 28 / 42 mp3 MIME 42 / 冷加载 DCL 2,032ms · load 2,673ms · 144.5KB（限 420KB）/ 线上版本 v5.1 |
| 零回归 | A1–A6 资金记账、B1–B11 存档兼容、C1–C6 抽卡概率保底、D1–D3 流程、E1–E2 性能布局、F1–F2 提示、G1–G3 版本文案、H/I 签名与导入矩阵全部 PASS |

## 七、其它

- 备份：`work/backup/20261109_p8/`（03a_core.js / 03c_album.js / 03d_end.js / regression_v5_gate.py / CHANGELOG.md / 本轮的 index.html 快照；P7 原产物可从推送前的 main commit 取回）。
- 新增脚本：`work/p8_bug14_repro.py`（BUG-14 独立复现与回归，11 项）、`work/make_online_gate_page.py`（一键提交页生成）。
- 未改 `.github/workflows/ci.yml`：它已直接运行 `regression_v5_gate.py`，新断言自动进 CI。
