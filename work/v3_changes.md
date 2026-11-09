# v3 改动清单 · 拆小卡模拟器 STAR7

基准：commit `5b945aae`（index.html 871,690 B，sha256 `1851baada10b4f8cbf37aa542e1cc329c63a70fd6f64fb67ffb1293808a516c5`）
交付：commit `11c700bb`（index.html 174,850 B，sha256 `22f726d3e2e9f47c994db13866efa3eed48bfd75a89d860ebc4381836544fbd6`）
远端：`hlm428/star7-gacha` main，Pages `https://hlm428.github.io/star7-gacha/` 已刷新，index.html + 28 assets 全部 sha256 与本地一致。

---

## 一、成员新卡面（14 张，assets/*.webp 相对路径）

原 7 张 `_main` 立绘保留作卡册封面与海报；N/R 用现有 `_avatar` 头像。新增 14 张：每位成员各一张 SR 生活照 + 一张 SSR 舞台照，统一 880×1173 竖幅、赛璐璐加柔光厚涂；SSR 取画面上部 72% 七分身裁切、横向居中。

| 文件 | 尺寸 | 体积 | 类型 |
| --- | --- | --- | --- |
| bl_sr.webp | 880×1173 | 91,262 B | NEW 生活照 |
| bl_ssr.webp | 880×1173 | 127,936 B | NEW 舞台照 |
| gy_sr.webp | 880×1173 | 101,248 B | NEW 生活照 |
| gy_ssr.webp | 880×1173 | 109,666 B | NEW 舞台照 |
| ja_sr.webp | 880×1173 | 101,176 B | NEW 生活照 |
| ja_ssr.webp | 880×1173 | 117,676 B | NEW 舞台照 |
| lq_sr.webp | 880×1173 | 100,220 B | NEW 生活照 |
| lq_ssr.webp | 880×1173 | 99,704 B | NEW 舞台照 |
| sy_sr.webp | 880×1173 | 82,138 B | NEW 生活照 |
| sy_ssr.webp | 880×1173 | 98,964 B | NEW 舞台照 |
| wy_sr.webp | 880×1173 | 91,178 B | NEW 生活照 |
| wy_ssr.webp | 880×1173 | 81,200 B | NEW 舞台照 |
| xz_sr.webp | 880×1173 | 97,658 B | NEW 生活照 |
| xz_ssr.webp | 880×1173 | 122,656 B | NEW 舞台照 |

（28 张全量见上一节末尾表格：7 main + 7 avatar + 14 NEW）

旧 v3raw/v3raw2 素材与替换前 `*_sr`/`*_ssr.webp` 全部挪入 `work\backup\v3_art_old\`，未删除。

图片处理脚本：`work\process_v3_fix.py` → 裁四边 1.2% 去 AI 水印 → SSR 七分身裁切 → resize 880×1173 → webp method=6；体积限值 SR≤100KB、SSR≤140KB，bl_sr 单独 q=50 + GaussianBlur(0.4) 压到 89.1KB。

---

## 二、生日限定池（第 10 天沈星野 / 第 20 天江予安）

`work\src\02_data.js`
- sy：`birthday:'3月14日', birthMD:'03-14'`（第 10 天 = 3/14，起始 3/5 加 9 天）
- ja：`birthday:'3月24日', birthMD:'03-24'`（第 20 天 = 3/24）
- wy：原 3/24 与 ja 撞日，改 `birthday:'8月18日', birthMD:'08-18'`
- 注释行 159 注明对应关系

`work\src\03a_core.js` initPoster()
- 新增 `isBirthday = birthdayKeyForDay(state.day) === key`
- 海报复用该成员 `ssr` 舞台图（生日当天）或 `main` 立绘（非生日）
- `.poster-art.bday` 开关；pool-tag 同步 `.bday`

`work\src\00_head.html` 新增 CSS
- `.poster-art.bday`：暖金滤镜 saturate/sepia/hue-rotate + 18px 圆角 `inset 2px 金光描边` + 34px 金光晕 + 金粉渐变覆盖
- `.pool-tag.bday`：金粉渐变背景 + `#d94f6c` 主色色块 + 粉色阴影

`work\src\03d_end.js`（规则页）
- 生日文案改为：今天"今天是 X 的生日，限定池只开一天！"（5000ms）、前一天"明天是 X 的生日，限定池只开一天，记得攒钱呀～"（6500ms）
- 规则页生日条目同步为 沈星野 3/14、江予安 3/24

`upKeyNow()` / `birthdayKeyForDay()` 逻辑未改，生日当天自动切换 UP，前一天 coach 提示；概率、保底、UP=50% 分支全部保留。

---

## 三、成员档案页

`work\src\03c_album.js`
- 卡册头像 `.mtab .av[data-member]` 悬停/点击触发 `openProfile(key)`
- 档案弹窗 `.profile-wrap`：
  - 顶部头像 + 名字 + 队内定位
  - 生日 / 星座 / 应援色 / 自我介绍
  - 8 句台词逐行展示，未解锁显示 `？？？`，已解锁按解锁顺序列出
- 档案页头部「档」徽标、关闭按钮

`work\src\03b_gacha.js` applyResults()
- 每张新卡 `unlockLine(c)`，取 `state.lines[member]` 数组末位对应 CARD_QUOTES 句子
- 解锁随 `__game.save()` 写入 localStorage，刷新不丢

`work\src\03a_core.js` 定义 CARD_QUOTES（7 人 × 8 句，互不重复）

`work\src\03f_init.js` 暴露 `__game.grantCard` / `fillMember` / `finishAll` / `setMoney` / `gameDate` / `birthdayKeyForDay` / `upKeyNow` 供测试调用。

---

## 四、上次四处改动（复查，未动）

1. **十连 2×5 布局**：`work\src\00_head.html` #packGrid 五列自适应，十连 stagger 入场动画已保留（验收 360×780 实测 rows=5, cols=2, 单卡 ≥150×220）。
2. **SSR 全屏时长约 1.6s**：`work\src\03d_end.js` openSSR/closeSSR 超时 1600ms 未改（验收实测 1000–2100ms 通过）。
3. **四档边框分级与稀有度角标放大**：`.rb` 字号 ≥16px，N/R/SR/SSR 边框颜色各不相同（验收全过）。
4. **卡册 7 人标签两行 + 集市「生活费不足」+「还差 ¥xx」**：03c_album.js + 03a_core.js 未回退。

---

## 五、构建产物

- `work\build.py`：拼接 `00_head.html` + `01_body.html` + 8 个 JS → `outputs/index.html`；镜像 `assets/*.webp` 到 `outputs/assets/`
- `outputs/index.html`：174,850 B / 3,094 行 / sha256 `22f726d3e2e9f47c994db13866efa3eed48bfd75a89d860ebc4381836544fbd6`
- `outputs/assets/`：28 个 webp（7 main + 7 avatar + 14 sr/ssr），全部相对路径引用，无外链

---

## 六、自测与回归

| 项目 | 结果 |
| --- | --- |
| 360×780 30 天全流程（test_v3.py） | **42/42 PASS** |
| 控制台报错 | 0 |
| 图片加载失败 | 0 |
| 外链 | 0（全部 file:// / data: / 同域 assets） |
| assets 28 个 webp 全加载 | ✓ |
| 56 张卡（7 成员 × 8 稀有度）全显示、0 坏图 | ✓ |
| 图源共 21 个（7 × main/sr/ssr） | ✓ |
| 新图全部 880×1173 + 体积达标 | ✓ |
| 档案页三要素齐全 / 8 句台词 / 解锁顺序 / 存档持久 / 刷新不丢 | ✓ |
| 生日池第 9 天提示、第 10 天海报+配色+UP+sub+coach 全天正确 | ✓ |
| 生日池第 19/20 天（江予安）同上 | ✓ |
| 第 11/21 天恢复常态池（sy UP） | ✓ |
| v2 全量回归（test_v2.py） | **137/137 PASS** |
| SSR 标题/按钮/卡面零交集回归（test_ssr_title.py） | **0 failure** |

---

## 七、线上验证

- 推送：`git/trees` 逐文件（29 blob：index.html + 28 webp），不 force，旧 HEAD `5b945aa` → 新 HEAD `11c700bb`
- Pages 构建完成后（约 15s）：
  - `https://hlm428.github.io/star7-gacha/` index.html sha256 = 本地 `22f726d3…` —— **MATCH**
  - 28 个 webp 全部与本地 sha256 一致 —— **28/28 MATCH**
  - 抽查 sy_ssr.webp / ja_sr.webp / bl_sr.webp / xz_ssr.webp / wy_main.webp 线上字节一致性 —— **5/5 OK**

---

## 八、关键改动文件索引

| 文件 | 作用 |
| --- | --- |
| `work\src\00_head.html` | 生日池 CSS、稀有度角标、海报容器 |
| `work\src\01_body.html` | #posterArt / .pool-tag / #upName / #posterSub |
| `work\src\02_data.js` | 生日日期、CARD_QUOTES 8×7 |
| `work\src\03a_core.js` | initPoster（生日配色 toggle）、applyResults |
| `work\src\03b_gacha.js` | pickSSR / upKeyNow / unlockLine |
| `work\src\03c_album.js` | openProfile 档案页、7 人两行标签 |
| `work\src\03d_end.js` | 生日 coach 文案、规则页 |
| `work\src\03e_canvas.js` | file:// 协议防 canvas 污染 |
| `work\src\03f_init.js` | init 顺序、__game 暴露 |
| `work\build.py` | 拼接 + assets 镜像 |
| `work\process_v3_fix.py` | 14 张新图：裁水印 → SSR 七分身 → resize → webp |
| `work\backup\v3_art_old\` | 38 个旧素材备份（v3raw + v3raw2 + 旧 *_sr/-ssr.webp） |

---

无概率、保底、价格、生活费、结局判定等数值改动；无删除文件操作。
