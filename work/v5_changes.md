# v5.0 改动清单（2026-11-08）

依据 `改进提示词.md`：先做 P0 / P1 的缺陷与收尾，再按第四轮反馈做 P6（存档签名版本门禁 / 页内 CHANGELOG / 单测与 CI）；数值（价格 / 概率 / 保底 / 生活费 / 上限）全部保持不变。
构建：`python work/build.py` → `outputs/index.html` 238,832 B / 4,268 行（MD5 `9C6A8A80636B7C212DDE3E2329D1B70E`），单文件内联、产品零第三方依赖。

## P0 · 资金口径统一

| # | 文件 / 行号 | 改动 |
|---|---|---|
| P-01 | `work/src/03a_core.js` L421-446 | `addMoney(n, reason)` 成为唯一加钱入口：按**实际到账**记账（封顶 `GAME.SAVE_CAP`），返回 `{gained, spilled}`；余额已达上限时只增不减；负数不记收入。`INCOME_FIELD` 映射 daily/sell/reward/event。 |
| P-01 | `work/src/03d_end.js` L204-208 | `nextDay()` 改用 `addMoney(inc,'daily')`，删除 `state.money = Math.min(...)` 与手写记账；旧档余额 >600 时跨天不再被削回 600。 |
| P-01 | `work/src/03d_end.js` L108-115 | 中期考核 `claimMidterm()` 改走 `addMoney(gain,'reward')`，toast 显示实际到账与溢出。 |
| P-01 | `work/src/03d_end.js` L169-174 | 随机小事件改走 `addMoney`，正数归 `event`；弹窗金额显示实际到账。 |
| P-01 | `work/src/03c_album.js` L216-226 | 收集奖励改走 `addMoney(…,'reward')`；toast 标明上限溢出。 |
| P-01 | `work/src/03c_album.js` L366-376 | 碎片寄卖改走 `addMoney(gain,'sell')`；toast 标明上限溢出。 |
| P-01 | `work/src/03f_init.js` L192-197 | `setMoney` 钩子同样封顶 `SAVE_CAP`；`__game` 暴露 `addMoney` 与 `saveCode` 便于测试。 |
| — | 扣费路径 | `doPull` / 集市购买保持直扣（`canPay` 兜底），余额不为负；未改数值。 |

## P0 · 首局 / 二周目一致

| # | 文件 / 行号 | 改动 |
|---|---|---|
| P-04 | `work/src/03d_end.js` L353-372 | `restartGame()` 删除随机 `dayIncome` 与凭空记账：起始 ¥500、`income` / `incomeDaily` 均为 0。 |
| P-04 | `work/src/03d_end.js` L387-399 | `startGame()` 删除重复的第 1 天生活费，起始 ¥500、`dayIncome` 0，与二周目逐项一致。 |

## P1 · 结算 / 小屏 / toast / 存档码 / 文案

| # | 文件 / 行号 | 改动 |
|---|---|---|
| P-02 | `work/src/03a_core.js` L503-517 | 结算后 `pull1Btn` / `pull10Btn` 置灰并 `aria-disabled=true`，下一天按钮同样置灰；`closeSettlement()` 后恢复。 |
| P-02 | `work/src/03b_gacha.js` L111 | 结算后抽卡 toast 改为「本局已结算，点「再来一局」重新开始」。 |
| P-02 | `work/src/03a_core.js` L403 | `guardPackBusy` 结算拦截文案统一「本局已结算」。 |
| P-02 | `work/src/03d_end.js` L196 | 结算后点下一天：toast「本局已结算…」并打开结算页。 |
| P-02 | `work/src/03d_end.js` L274 | 二次确认文案改为与实现一致：进入结算页 + 暂时锁定，点「返回继续」可撤销。 |
| P-02 | `work/src/03d_end.js` L290 | `openSettlement()` 内补 `render()`，结算瞬间刷新按钮置灰态。 |
| P-06 | `work/src/00_head.html` L747、L893-897 | 新增 `.settle-dock`；`max-height:700px` 下固定底部、结算卡底部留白 128px，320×568 首屏可见「保存图片」。390×844 不进入该媒体查询，布局不变。 |
| P-06 | `work/src/01_body.html` L283-292 | 两个 `.settle-actions` + 提示行包进 `.settle-dock`（结构收敛，样式语义不变）。 |
| P-03 | `work/src/03a_core.js` L339-381 | toast 改为「最新优先 + 警告优先」：当前条最多再占 700ms（警告 1000ms）即切到最新；新普通提示会挤掉更早的普通提示，警告类保留。 |
| P-05 | `work/src/03c_album.js` L425-451 | 存档码增加轻量签名（FNV-1a + 固定盐），格式 `base64 + '.' + digest`；无签名的老码仍兼容。 |
| P-05 | `work/src/03c_album.js` L551-565 | 导入先验签（失败提示「存档码校验失败（内容可能被修改）」），再校验结构；`money` 越界收敛到 `SAVE_CAP`。 |
| P-07 | `work/src/03d_end.js` L314、L353-399 等 | 结算「领到的生活费总额」改名「累计收入」；图鉴 `56` / 天数 `30` 改用 `GAME.TOTAL_CARDS` / `GAME.TOTAL_DAYS`。 |
| P-08 | `work/src/00_head.html` L7、`work/src/03f_init.js` L172 | 版本号统一 `v5.0`（`meta` 与 `__game.version`）。 |
| P-08 | `work/src/03d_end.js` L416-422 | 规则文案改由常量生成：保底 `GAME.PITY_MAX`、价格 `PRICE1/PRICE1_FIRST/PRICE10`、生活费 `DAILY_MIN–MAX`、上限 `SAVE_CAP`、天数 `TOTAL_DAYS`、兑换价 `RARITY_INFO.exchange`、事件池 `SMALL_EVENTS.length`；SR 综合改 11.1%（实测）；生日池改正为「海报与卡包换成寿星主题，UP 仅在寿星非默认 UP 时切换」；补「免费十连券仅当天有效」。 |

## P6 · 存档签名版本门禁 / 页内 CHANGELOG / 单测与 CI

| # | 文件 / 行号 | 改动 |
|---|---|---|
| P6-一 | `work/src/02_data.js` L213-217 | `SAVE_VER` 4→5；新增 `GAME.VERSION='v5.0'` 单一版本常量。 |
| P6-一 | `work/src/03c_album.js` L424-458 | `decodeSaveCode()` 按版本判定：`v>=5` 必须带签名，缺签名直接拒（「存档码缺少签名」）；`v<=4` 才允许无签名以兼容老码；签名错误仍提示「内容可能被修改」。`validateSavePayload` 沿用 `SAVE_VER`，放行 `v<=5`。 |
| P6-一 | `work/src/03c_album.js` L424-429 | 注释写清产品边界：客户端签名只能防随手改档，防不住有意伪造；真防作弊需服务端校验。规则页同步展示。 |
| P6-二 | `work/src/03d_end.js` L401-437 | `openRules()` 增加「版本 v5.0 · 修订记录（v3.2 → v5.0）」可展开段落：首轮 10 项、第三轮 21→20、第四轮 P-01~P-07；并展示存档防改档边界。 |
| P6-二 | `work/src/03c_album.js` L378-392 | `openMore()` 增加「版本 v5.0」条目并指向规则页修订记录。 |
| P6-二 | `work/src/03f_init.js` L172-175 | 初始化时把 `meta[name=version]` 与 `__game.version` 统一设为 `GAME.VERSION`，消除二次漂移。 |
| P6-三 | `work/regression_v5_gate.py` | 固化第四轮断言：A 资金记账 11 组、B 存档 11 组（合法签名 / 篡改+签名 / 剥离签名 / v2 / v4 / 残缺 / 纯 base64 伪造 / 自签伪造 / 覆盖确认 / 撤销 / 无效码）、C 10 万单抽 + 5,000 批十连、D 流程、E 320×568/360×780/390×844、F toast ≤1s、G 版本/CHANGELOG；输出 PASS/FAIL 表与 `work/v5-gate-report.md`。 |
| P6-三 | `.github/workflows/ci.yml` | PR / main 触发：构建 → 跑门禁 → Job Summary 与 PR 评论输出 PASS/FAIL → 上传报告与截图；失败即阻断合并。 |

## P6 实测（2026-11-08）

`python work/regression_v5_gate.py` → **46 / 46 PASS**（完整表见 `work/v5-gate-report.md`）：

- **A 资金 11 组**：A1 ¥580+¥180 → ¥600，收入 +20、溢出 160；A2a ¥599+¥80 → 到账 1；A2b ¥600 领奖 0 变化；A3a 旧档 ¥760 跨天不减；A3b ¥550 → ¥600、`dayIncome=50`；A4 首局 / 二周目四项差 0；A5a 碎片溢出 460；A5b 收集溢出 168；A5c 事件溢出 25；A5d `setMoney` 700 / 1e6 → 600；A6 4 局 × 30 天 identity / NaN / 负余额 / 超上限 = 0（终值 money 591）。
- **B 存档 12 组**：B1 合法签名 round-trip（`v=5`、JSON 全等）；B2 空壳档拒；B3 篡改内容 + 原签名拒（校验失败）；B4 剥离签名拒（缺少签名，余额仍 321）；B5 残缺码拒（无法识别）；B6 v2 老码 day5 / ¥250 / 图鉴 1；B7 v4 老码 day8 / ¥260 / 图鉴 2；B8a 覆盖确认后生效、B8b 撤销恢复旧档；B9 纯 base64 v5 伪造档拒且图鉴不刷满；B10 自签伪造档 money 收敛 600 / unique 56（客户端签名的已知边界，非失败）；B11 无效码有可见提示。
- **C 抽卡**：10 万单抽 SSR **2.842%**；最大间隔 59、大保底违规 0；UP 占比 **66.47%**；5,000 批十连无 SR **0** 批、UP 65.99%；第 25 天第 20 抽 SSR / 第 21 抽 SR（前 20 实测 3.48%，之后 2.13%）。
- **D 流程**：u=19/20/36 → ¥80/120/180 且教练文案一致；第 25 天券跨天提示已过期；第 30 天二次确认可撤销、确认后按钮 `aria-disabled=true`。
- **E 布局**：320×568 保存按钮 top 419 / bottom 469（vh 568，fixed）；360×780 top 631 / bottom 681（vh 780，fixed）；390×844 top 684 / bottom 734（static）；三视口均无横向溢出；首屏 1 图 / 306.8KB。
- **F 提示**：连发 4 条 toast，约 700ms 内显示最新 T4（阈值 ≤1s）。
- **G 版本**：`__game.version` 与 `meta[name=version]` 均为 v5.0、`SAVE_VER=5`；规则页含 v3.2 / v4 / v5.0、「21→20」、无签名边界与服务端校验、价格 / 上限常量；更多玩法含「版本 v5.0」。
- **ALL**：全流程 0 pageerror。
- **既有全量回归**：verify 60/60、test_v5 38/38、test_income 13/13、test_gacha 14/14、test_lazy 14/14、day15-audit 58/58。
- **结论：核心玩法与资金记账无回归**（A6 四局 × 30 天账本恒等违规 0；C1-C6 概率与保底同 v5 基线）。

## 测试改动

- `work/verify_v32.py` L30：版本断言 → v5.0；L196：剧情分支前 `setMoney(200)`，避免生活费+¥40 撞上限造成抖动。
- `work/test_income.py` L62-63、L76、L93、L108：在跨天 / 寄卖 / 中期 / 收集奖励前压低余额，按「实际到账才记收入」的新口径断言。
- `work/test_v5.py`（新增）：P0/P1 验收 6 组 + 32 项断言。
- 证据：`work/v5-shots/settle_390x844.png`、`settle_320x568.png`。

## 实测结果

- 全量回归 `verify_v32.py`：60 / 60。
- 专项：`test_v5.py` 32 / 32；`test_income.py` 13 / 13；`test_gacha.py` 14 / 14；`day15-audit/run_audit.py` 58 / 58；`test_lazy.py` 14 / 14。
- 资金验收：¥580+¥180 → ¥600，收入 +20、溢出 160；旧档 ¥760 跨天不下降；首局 / 二周目均 ¥500 且收入 0；¥19 抽一次恰好为 0 且不可再抽。
- 结算：确认后抽卡 / 下一天置灰 + `aria-disabled`，点击提示「本局已结算」；「返回继续」解除。
- 矮屏：320×568 保存图片按钮 `position:fixed` 且首屏可见，无横向溢出，内容可滚动到底；390×844 布局不变。
- toast：连发 3 条 950ms 内显示最新；「券过期」警告先于「生活费」提示展示。
- 存档码：带签名可解码；改一个字符被拒；老码无签名可导入；伪造 ¥1,000,000 导入弹窗显示 ¥600。

## 与提示词冲突 / 未完成

1. **第 1 天生活费**：提示词同时要求「删除 startGame 中重复的 +dayIncome」与「首局 / 二周目 money 相等」。为同时满足，首局不再发放第 1 天 ¥45–70，双方均以 ¥500、`income=0`、`dayIncome=0` 开场；跨天生活费数值未变。若产品希望首日仍发生活费，则需改为「双方都发」，届时验收 D 只能放宽。
2. **`gainShards` 不是 money 写入点**：提示词把它列为 9 处加钱之一，实际它只写碎片；已按「所有加钱路径」接入 `addMoney`，碎片逻辑未动。
3. **P3 分层重构未执行**：单文件 HTML 的纯函数仍未拆分为独立模块，避免为单测改交付结构；P3 的「单测与 CI」已以 P6 的 Playwright 门禁形式落地（`work/regression_v5_gate.py` + `.github/workflows/ci.yml`）。P3 第 5 条（分层风险评估）见下：`addMoney` 仍是 `state` 闭包内写库函数，未来可拆为 `applyMoney(state, n, cap)` 纯函数 + 落盘薄壳，风险中等。
4. **P4 / P5** 为回归 QA 与提示词精简版，未重复建文档；回归结论以上表为准。
5. 存档码签名是客户端摘要，能挡随手改 JSON，无法防逆向伪造（密钥在客户端必然可见），属轻量校验的既定边界。

## 推送与线上

- 远端 main：`4cb6308`（P6 功能与证据提交 `20b902e`，父提交 `767d4c4`）。
- 本地提交：`923a4d2` / `e47a457`（同一内容的本地副本；线上历史由 Git Trees API 单提交生成）。
- Pages：`4cb6308` 构建状态 `built`（2026-11-08 22:51–22:52 CST）。
- 线上 `https://hlm428.github.io/star7-gacha/` 实测 **238,832 B / MD5 `9C6A8A80636B7C212DDE3E2329D1B70E`**，与本地 `outputs/index.html` **逐字节一致**（`b == a` 为 True）。
- **CI 工作流未上线**：本机 `gh` 令牌不含 `workflow` scope，写入 `.github/workflows/ci.yml` 固定返回 404；门禁脚本已推送（`work/regression_v5_gate.py`），启用方式见 `work/v5_changes_p6.md` 末节。
