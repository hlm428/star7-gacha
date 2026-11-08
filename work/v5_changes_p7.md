# v5.1（P7 / PROMPT 08）改动清单 · 2026-11-09

> 范围：仅 P7 四项。未改动 addMoney 唯一入账、抽卡纯函数、存档强校验、toast 队列、断点 800px 等 P0–P6 已修好的部分。
> 产物：单文件 `outputs/index.html`（构建后 240,427 B），零第三方运行时依赖。

## 一、BUG-13：v4 降级绕过强制签名

**复现（改前，`work/p7_repro_bug13.py` 实测）**

| 步骤 | 结果 |
|---|---|
| 取合法 v5 导出码，把 JSON 的 `v:5` 改成 `v:4`、去掉 `.签名` | 纯 base64，56 张卡 / money 1,000,000 |
| 新设备导入 | **被接受**：day 12 / ¥600（收敛到 SAVE_CAP）/ 图鉴 56/56 / 碎片 5000 |
| `normalizeSave` 后重新导出 | `v=5`、签名验证通过，得到一枚**合法签名码** |
| 第三台设备导入该洗白码 | 成功，全卡与余额照旧 |

根因链：`decodeSaveCode()` 对 `v<=4` 跳过签名校验 → `validateSavePayload()` 放行 `v<=5` → `normalizeSave()` 第 145 行强制 `s.v = GAME.SAVE_VER` 洗白。

**方案取舍**

- ① 白名单特征：v4 / v5 的 payload 结构没有可区分字段，放弃；
- ② 兼容截止 / 移除无签名兼容：会破坏 v2 / v4 真实老码导入，放弃；
- ③ **采用**：保留兼容，把边界说清楚 + 导入后可见警告。

**落地（方案③ + 加固）**

| 文件 | 位置 | 行为 |
|---|---|---|
| `work/src/03c_album.js` | `decodeSaveCode()` 约 L456 | 返回值新增 `unsigned: !sig`，把「本次没有签名」这一事实交给导入层 |
| `work/src/03c_album.js` | `pendingImportUnsigned`（L4）、`applySaveCode()` L559-L581 | 校验失败时清零；校验通过后置为 `unsigned && v<=4` |
| `work/src/03c_album.js` | `commitImportSave()` L602-L633 | 成功弹层正文追加红色警告「旧版兼容码：未签名，仅建议用于升级」，并补一条 warn toast |
| `work/src/03d_end.js` | 规则页「存」条目 L424 | 明写：把存档码 JSON 里的 `v` 改成 4 并去掉签名后缀会被当作旧版兼容码接受；这是保留 v2/v4 真实老码导入的妥协 |

未破坏：v2 / v4 真实老码导入、残缺码拒绝、覆盖二次确认、备份与撤销（B6/B7/B8/B5 仍全绿）。

## 二、版本号 v5.1

| 文件 | 位置 | 改动 |
|---|---|---|
| `work/src/02_data.js` | L217 | `VERSION: 'v5.0'` → `'v5.1'`（`meta[name=version]` / `GAME.VERSION` / `__game.version` 同一出口，`SAVE_VER` 仍为 5） |
| `work/src/03c_album.js` | 更多玩法 L391 | 版本区间文案 `v3.2 → v5.1` |
| `work/src/03d_end.js` | 规则页 L425-L431 | 标题改 `v3.2 → v5.1`，新增 v5.1 条目 |
| `work/CHANGELOG.md` | 顶部 | 新增 v5.1 记录 |

## 三、文案两处

| 文件 | 位置 | 改前 → 改后 |
|---|---|---|
| `work/src/03d_end.js` | `startGame()` L396 | 「第 1 天 · 起始生活费 ¥500 已就位」→「初始资金 ¥500 已就位」（该笔不计入 `stats.income`，J1 断言 `income=0 / dayIncome=0`） |
| `work/src/03d_end.js` + `work/CHANGELOG.md` | v3.2 条目 | 「首轮 10 项缺陷修复」→「首轮测试基准版本，含 10 项缺陷」 |

## 四、单测与 CI

**`work/regression_v5_gate.py`**（CI `star7-gate` 直接运行，无需改 workflow）

- 新增 H 组：签名 / 版本矩阵 10 组
  - H1 v5 合法签名接受；H2 v5 去签名拒绝；H3 篡改保留签名拒绝；H4 空签名（尾点）拒绝；
  - **H5 v4 降级无签名（满卡 / 超上限）→ 接受 + money 收敛 600 + 图鉴 56 + 可见警告**；
  - H6 v4 错误签名拒绝；H7 v3 无签名接受 + 警告；H8 v2 无签名接受 + 警告；
  - H9 v6 合法签名 → 版本不受支持；H10 v0 → 版本不受支持。
- 新增 I 组：`validateSavePayload` 导入层校验 9 组（走 `applySaveCode → validateSavePayload` 真实 UI 路径）
  - 非对象数组 / 缺版本号 / 版本超上限 / 缺卡册 / 无效卡 ID / 天数越界 / 生活费为负 / 碎片超上限 / 空壳无进度；每组同时断言进度不变。
- 新增 J1：首局提示文案 + `money=500 / income=0 / dayIncome=0`。
- 新增 F2：警告类 toast 优先且 ≤1s（实测 703ms）。
- E2 视口从 3 个扩到 6 个：320×568 / 360×640 / 360×780 / 375×667 / 390×844 / 414×896，保存图片按钮均首屏可见。
- G1–G3 版本断言升到 v5.1，并新增「v 改成 4」「旧版兼容码：未签名」边界文案断言。
- 原有 46 项断言全部保留。

**本地结果：PASS 70 / FAIL 0**（46 原有 + 10 H + 9 I + J1 + F2 + 3 个新增视口）。

**`work/online_gate.py`（新增，部署后单独跑）**

真实 URL `https://hlm428.github.io/star7-gacha/`，断言：

| 编号 | 断言 | 阈值 |
|---|---|---|
| O1 | console error | 0 |
| O2 | pageerror | 0 |
| O3 | 4xx / 5xx 响应 | 0 |
| O4 | 28 张 webp 真实解码 | 28/28（`new Image()` 解码，`naturalWidth>0`） |
| O5 | 42 个 mp3 可达 + MIME | 42/42 `audio/mpeg` |
| O6 | 冷加载基线 | DCL ≤ 6000ms / load ≤ 8000ms / 传输 ≤ 420KB |
| O7 | 线上版本 | `__game.version` 与 `meta[version]` 均为 v5.1 |

报告输出 `work/online-gate-report.md` 与 `work/online-gate-results.json`。

## 五、最终验收

| 项 | 结果 |
|---|---|
| 构建 | `outputs/index.html` 240,427 B，MD5 `17EDE13DF7D75967B3FAF578E803D5CE`（v5.0 为 238,832 B / `9C6A8A80…`） |
| 本地门禁 | `regression_v5_gate.py` **PASS 70 / FAIL 0** |
| CI（GitHub Actions） | `star7-gate` run `42526388854`（commit `1048825`）**success**；线上门禁脚本修订后 run `42527010409`（commit `00b5296`）**success** |
| Pages | `pages build and deployment` 两次均 **success** |
| 线上逐字节 | 线上 240,427 B / MD5 `17EDE13D…`，与本地 **SHA256 完全一致** |
| 线上门禁 | `online_gate.py` **PASS 8 / FAIL 0**：console error 0 / pageerror 0 / 4xx-5xx 0 / 28 webp 解码 28 / 42 mp3 MIME 42 / 冷加载 DCL 2,968ms · load 3,601ms · 传输 144.2KB（限 420KB）/ 线上版本 v5.1 |

## 六、其它

- 被替换的旧文件已备份：`work/backup/20261109_p7/`（02_data.js / 03c_album.js / 03d_end.js / regression_v5_gate.py / CHANGELOG.md）。
- 未改 `.github/workflows/ci.yml`：CI 已直接运行 `regression_v5_gate.py`，新增断言自动进 CI；本机 token 无 `workflow` scope，不做 API 硬推。
- 新增脚本：`work/p7_repro_bug13.py`（BUG-13 复现与回归）、`work/online_gate.py`（线上门禁）、`work/push_v51.py` / `work/push_one.py`（Trees API 推送）。
