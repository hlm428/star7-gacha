# v4 改动清单 · 拆小卡模拟器 STAR7

基准：v3 交付产物 `outputs\index.html`（217,700 B 字符 / 3,875 行）
本轮交付：`outputs\index.html` 220,530 字符 / 3,934 行 / 224,464 字节（CRLF），assets 28 个
sha256：`818085618825085B1C36AA41E6DF12D995E8E378199A9DF4779A6D98AEBAC63C`

本轮先做用户指定的三套改进，复用现有弹窗、卡册、碎片、主色调与存档结构；随后按外部测试报告修复 P-01~P-03 与 UP 提示。价格、概率（除第 25 天方案显式要求）、保底、每日生活费、结局判定均未改动。

---

## 一、固定事件日（30 天写死日历）

`work\src\03d_end.js`
- 新增 `FIXED_EVENTS`：第 5 / 10 / 15 / 20 / 25 / 30 天。
- `nextDay()` 优先判定固定日：命中则弹固定事件，且当天不再掷随机小事件。
- `triggerFixedEvent(day)`：
  - 第 5 天：`freeSingles += 1`，弹剧情（沈星野留你加练），双选项走 `chooseStory()`，两条分支都收在「……谢了。」并播放语音。
  - 第 10 / 20 天：生日限定池照旧 + `shards += 30` + 生日语音；弹窗含「点亮应援灯牌」互动（`.light-stick`，点亮后发光并重播生日语音）。
  - 第 15 天：按当前图鉴 `<20 / 20–35 / ≥36` 三档评语，奖励 ¥80 / ¥120 / ¥180 写入 `midtermPending`，需点「领取」才入账（避免污染当日生活费增量与既有断言）。
  - 第 25 天：`boostDay = 25`（当天 SSR 基础概率 2% → 3.5%，SR 仍 8%），并发 `freeTen = 1`、`freeTenDay = 25`（仅当天有效的免费十连券）。
  - 第 30 天：进入结算，附 7 位成员全员寄语。
- `claimMidterm()`：领取待发奖励，写入 `money` 与 `stats.income`。

`work\src\03b_gacha.js`
- 抽卡概率：`const ssrRate = state.boostDay === state.day ? .035 : .02`，后续档位顺延；非第 25 天仍为 SSR 2% / SR 8% / R 30%。
- `doPull(n)`：免费单抽 `freeSingles`、当天免费十连 `freeTen` 优先抵扣，不扣生活费；十连保底 SR 不变。

`work\src\01_body.html` / `00_head.html`
- 抽卡区新增 `#couponRow` 券行（免费单抽 / 免费十连 / 中期考核待领）。
- 新增 `.story-wrap / .story-art / .story-kicker / .story-title / .story-text / .story-quote / .story-choices` 与 `.bday-wrap / .bday-glow / .light-stick` 样式。

---

## 二、随机小事件

`work\src\03d_end.js`
- `SMALL_EVENTS` 共 12 个：练习室留灯(+¥50)、成员私信(+6 碎片)、公司楼下偶遇(免费单抽)、被粉丝认出(称号进度+1)、雨天共伞(+10 碎片)、咖啡店、拍照、周边店、电台、失物、群聊红包、散步等。
- `RAINY_DAYS = [3,9,14,22,28]`，`isRainyDay()` 过滤「雨天共伞」。
- `maybeSmallEvent()`：每日进入下一天后 30% 概率，一天最多 1 次；最近 7 天出现过的事件排除，避免连续重复。
- `applySmallEvent(ev)` 结算 money / shard / 免费券 / 称号，并写入 `smallEvents` 与 `events` 日志。
- `showSmallEvent()` 复用现有弹窗渲染（图标 + 标题 + 文案 + 效果 + 收下按钮）。

---

## 三、集齐成员的正式庆祝

`work\src\03c_album.js`
- `checkCollectRewards()` 重写为庆祝序列：星轨光点 → 立绘登场 → 专属色 → 大字「XX 的星轨，已全部点亮」→ 长独白打字机（`typeCollect()`，30ms/字）→ 奖励结算 → 保存海报。
- 结构：`.cc-stage / .cc-glow / .cc-star / .cc-portrait / .cc-kicker / .cc-title / .cc-quote / .cc-type / .cc-reward / .cc-share`。
- 触发：第 8 张卡到手（抽到或碎片兑换）立即中断当前流程进入庆祝。
- 奖励：生活费 +¥188、碎片 +30、称号「XX 的完整星轨」写入 `state.titles`；成员页背景永久替换（`#screenAlbum.member-done` + 专属色径向光）。
- 分享：`drawCollectCanvas()` / `saveCollectImage()` 生成 720×1040「XX 的星轨 已全部点亮」纪念海报（含成员主色渐变、星轨双环、长独白节选与虚构声明）。

`work\src\02_data.js`
- `COLLECT_LINES` 7 段集齐独白、`COLLECT_TITLE(key)`、`VOICE_LINES`（每位 ssr / collect / birthday / idle 四句）。

`work\src\00_head.html`
- `.modal-back.celebrate` 暗色星轨背景；`.modal.celebrate-box` 专属边框与光晕。
- 吸底操作区在庆祝弹窗内改为暗色渐变（修掉浅粉底把 ghost 按钮冲白的问题），ghost 按钮底色 `rgba(255,255,255,.16)` + 白字 + 半透明描边。

---

## 四、SSR 长独白（深读模式）

`work\src\02_data.js`
- `SSR_LONG`：7 位成员各一段 80–130 字长独白，语气贴合角色。

`work\src\03b_gacha.js`
- `nextSSR()` 记录 `currentSSR`、`startBGM('ssr')`、播放该成员 SSR 短语音；原有 1.6s 自动关闭时长保持不变。
- `showSSRDeep()`：点击「深读 · 长独白」→ 隐藏常规演出层、背景变暗、长独白逐字输出（38ms/字）并同步语音；`closeSSR()` 清理打字机与 deep 状态。

`work\src\01_body.html` / `00_head.html`
- SSR 层新增「深读 · 长独白」按钮与 `.ssr-deep` 面板；`.ssr-overlay.deep .ssr-inner{display:none}` 避免叠层。

---

## 五、声音分层与音量滑条

`work\src\03a_core.js`
- WebAudio 双总线：`bgmGain` / `sfxGain`；`vol = { bgm:.6, sfx:.8, voice:1 }`（默认 60% / 80% / 100%）。
- `BGM_PATTERNS`：`home`（轻快）、`tension`（保底≤10）、`ssr`（高燃星轨）、`album`（极轻环境音）、`collect`（成员主色变奏）。
- `refreshBGM()` 按「SSR 演出 → 集齐庆祝 → 拆卡 → 卡册 → 日常」优先级切曲；`sfx()` 新增 `complete` / `star`。
- `speak(text, memberKey)` / `stopVoice()`：`speechSynthesis` + 每位成员固定 `VOICE_PITCH`；不支持时静默降级。
- `applyVol()` 实时同步三条滑条。

`work\src\03f_init.js`
- 设置页三条独立滑条（BGM / 音效 / 语音）实时写 `state.vol` 并落盘；BGM 滑条改动会即时刷新当前曲目。
- `mute` 开关联动词音与 BGM；首次 pointerdown 解锁音频后调用 `refreshBGM()`。

---

## 六、其他 UI 修正（360×780 视觉复核）

- `.story-wrap`、`.bday-wrap` 增加 50px 顶部安全带，关闭按钮 × 不再压正文（此前 DAY 05 截图中 × 与「重新响」重叠）。
- 终章 `.sc-msgs` 取消 92px 内嵌滚动，7 条全员寄语在 360×780 全部可见；结算层自身可滚动，不再裁切。
- `.modal-back.celebrate .modal .actions` 改用暗色渐变，修复「稍后再领」按钮发白、文字不可读。
- 修复一处 `background-radial` 拼写错误的 CSS 行。

---

## 七、外部测试报告修复（P-01 / P-02 / P-03 / UP 提示）

**P-01 关键控件无障碍化**
- `03b_gacha.js`：翻卡 `.flip` 由纯 `<div>` 改为 `role="button" tabindex="0" aria-label="翻开第 N 张卡" aria-pressed`；翻开时置 `aria-pressed="true"`（含全部翻开与免撕直开路径）。
- `01_body.html`：撕包 `#packWrap` 加 `role="button" tabindex="0" aria-label`。
- `03f_init.js`：新增全局 Enter/Space keydown 委托——焦点在 `[role="button"]` 上时触发 click（原生 button/a/input 等跳过，避免重复触发）。`.collect-strip`（收下）、碎片兑换等既有 role="button" 控件随之全部键盘可达。

**P-02 浮层互斥**
- `03a_core.js`：新增 `guardPackBusy()`——拆包层展示中时拦截其他浮层（toast 提示 + 错误音）。
- `03c_album.js`：`openAlbum()` / `openMarket()` 开头加 `guardPackBusy()`，并先 `closeModal()`、互关另一屏，再展开自身。
- `03b_gacha.js`：`openPack()` 开头 `closeModal()` 并关闭卡册/集市两屏。保留特许：系统事件弹窗（modal, z36）仍可叠在拆包层（z30）之上。

**P-03 生活费文案区分状态**
- `03a_core.js` `render()`：已领显示「今日生活费已领 ¥N」，待领显示「进入下一天领取 ¥45-70」（取自 `GAME.DAILY_MIN/MAX`）。
- `01_body.html`：`#dayHint` 初始文案同步为「进入下一天领取 ¥45-70」。

**UP 提示**
- `01_body.html`：UP 胶囊下新增 `.up-hint` 小字「UP 仅对 SSR 生效」。
- `00_head.html`：新增 `.up-hint` 样式（9px 小字，海报暗区可读）。

---

## 八、存档兼容
- `SAVE_KEY` 保持 `star7_chai_xiao_v2`，未升版本号。
- `defaultState()` 新增字段：`smallEvents / tags / titles / fixedDone / midtermPending / freeSingles / freeTen / freeTenDay / boostDay / vol`。
- `load()` 对旧档缺字段补齐默认值并立即 `save()`；数组/对象做类型校验，数值 clamp，`midtermPending` 容错。
- `restartGame()` 保留称号与音量设置，其余进度重置。

---

## 九、验收结果

| 脚本 | 结果 |
| --- | --- |
| `work\test_v2.py` | 137/137 断言通过 |
| `work\test_ssr_title.py` | 3 视口 × 14 断言，0 failure |
| `work\verify_v5.py` | 11/11 PASS（首页存档/重开入口、存档码导出导入往返、重开二次确认取消/确认、0 JS 报错） |
| `v3\test_v3.py` | 42/42 PASS（30 天流程 / 56 卡 / 档案 / 生日池 / 0 报错 / 28 assets，首轮交付时） |
| `v4\verify_v4.py` | 31/31 PASS（固定事件、免费券、中期三档、第 25 天概率、随机事件、集齐庆祝、深读、音量、终章 7 条寄语，首轮交付时） |

---

## 十、首页直达入口：存档 + 重开（手机可用）

用户反馈：游戏要发给大家在手机上玩，不能让玩家靠浏览器控制台清 localStorage 重开；存档同理需要入口直达。

- `01_body.html`：卡池说明卡片按钮行新增「存档」（`data-act="save-menu"`）与「重开一局」（`data-act="restart"`）两个 link-btn，复用既有样式与全局 click 委托，零新增 CSS。
- `03c_album.js`：新增 `openSaveMenu()` 弹窗——说明自动存档已落本机，提供「导出存档码」「导入存档码」直达按钮（复用既有 `exportSaveCode()` / `importSaveCode()` / `normalizeSave()` 校验链路，此前仅藏于「更多玩法」弹窗底部）。
- `03f_init.js`：动作分发新增 `case 'save-menu'`。
- 重开复用既有确认弹窗（含「卡册图鉴与集齐奖励永久保留」说明）与 `restartGame()` 双轨重置，首页与结算页入口行为一致。
- `test_v2.py`：结算页重开断言选择器改为 `#settleOverlay [data-act="restart"]`（首页新增同 act 按钮后消除歧义，断言内容不变）。
- 新增 `work\verify_v5.py` 专项回归（11 断言，360×780 手机视口）。
- 存档格式 `SAVE_KEY=star7_chai_xiao_v2` 未动，旧档完全兼容；价格、概率、保底、生活费、集齐奖励、结局判定均未改动。

数值边界：非第 25 天 SSR 2% / SR 8% / R 30%；十连保底 SR、`PRICE1/PRICE10`、每日生活费区间、集齐 ¥188+30 碎片、结局判定均未改动。

截图（360×780）：`v4\shots\` 01–08，覆盖第 5 天剧情、第 25 天彩排、随机事件、集齐庆祝、成员专属背景、SSR 深读、音量设置、终章结算。
