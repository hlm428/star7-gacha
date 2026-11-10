# v5 发布门禁报告（P2 A~F + P6 存档门禁）

**PASS 80 / FAIL 0**

| 编号 | 用例 | 期望 | 结果 |
|---|---|---|---|
| A1 | ¥580+¥180 领考核奖励 | money600/income+20/reward+20/提示160 | PASS |
| A2a | ¥599+¥80 → gained=1 | money600/income+1 | PASS |
| A2b | ¥600 领奖 → 无账面变化 | money600/income不变/提示80 | PASS |
| A3a | 余额 760 跨天不减 | money760/dayIncome0 | PASS |
| A3b | 余额 550 跨天 dayIncome==实际增量 | money600/dayIncome50 | PASS |
| A4 | 首局 vs 二周目起始一致 | 四项差值均为0 | PASS |
| A5a | 卖碎片不突破 600 | money600/sell+20/提示溢出460 | PASS |
| A5b | 收集奖励不突破 600 | money600/reward+20/提示溢出168 | PASS |
| A5c | 小事件不突破 600 | money600/event+25/弹窗溢出25 | PASS |
| A5d | setMoney 不突破 600 | 700→600 / 1,000,000→600 | PASS |
| A6 | 4 局 30 天仿真账本恒等 | identity/NaN/负余额/超上限=0；无 pageerror | PASS |
| B1 | 合法签名 round-trip 字段全等 | decode 无错 / JSON 全等 / v=5 | PASS |
| B2 | {"cards":{}} 被拒且不清空 | 拒绝提示 + 进度不变 | PASS |
| B3 | 篡改内容 + 原签名被拒 | 校验失败 + 余额不变 | PASS |
| B4 | 剥离签名（v5）被拒 | 缺少签名 + 进度不变 | PASS |
| B5 | 残缺码被拒 | 格式无法识别 + 进度不变 | PASS |
| B6 | 首轮 v2 老码仍可导入 | day5/money250/图鉴1 | PASS |
| B7 | v4 老码仍可导入 | day8/money260/图鉴2 | PASS |
| B8a | 合法档覆盖确认后生效 | day12/money300/有撤销 | PASS |
| B8b | 撤销导入恢复旧档 | 恢复到导入前 | PASS |
| B9 | 纯 base64 伪造档（v5）被拒 | 缺少签名 + 图鉴不刷满 | PASS |
| B10 | 自签伪造档：兼容边界内收敛 | money收敛600 / 图鉴56（已知客户端边界） | PASS |
| B11 | 无效码有可见提示 | toast 含无效/格式 | PASS |
| C1 | 10万单抽 SSR 综合率 ∈[2.7%,3.0%] | 2.7–3.0% | PASS |
| C2 | 单抽最大间隔 ≤60 | maxGap≤60 / 大保底违规0 | PASS |
| C3 | UP 占比 ∈[63%,70%] | 63–70% | PASS |
| C4 | 5000 批十连无 SR 批次=0 | 0 | PASS |
| C5 | 十连 SSR/UP 占比 | UP 63–70% | PASS |
| C6 | 第25天第20/21抽 3.5%→2% | 20抽SSR / 21抽SR / 平日SR | PASS |
| D1-19 | 第15天 u=19 → ¥80 且文案一致 | ¥80 / 教练文案一致 | PASS |
| D1-20 | 第15天 u=20 → ¥120 且文案一致 | ¥120 / 教练文案一致 | PASS |
| D1-36 | 第15天 u=36 → ¥180 且文案一致 | ¥180 / 教练文案一致 | PASS |
| D2 | 第25天券跨天提示券已过期 | toast 含券已过期 | PASS |
| D3a | 第30天二次确认文案 + 再玩一天 | 含暂时锁定/返回继续；取消后 ended=false | PASS |
| D3b | 结算后按钮置灰 + aria | dim + aria-disabled=true | PASS |
| D3c | ended 后抽卡有明确提示 | toast 含本局已结算 | PASS |
| D3d | 返回继续撤销锁定 | ended=false/day30 | PASS |
| G1 | 版本号由单一常量输出 | __game/meta=v5.2 / SAVE_VER=5 | PASS |
| G2 | 规则页 CHANGELOG / 防改档边界 / 常量文案 | v3.2→v5.2 / 5 项边界声明 / 无改档步骤 / 价格上限来自 GAME | PASS |
| G3 | 更多玩法可看到版本与 CHANGELOG 入口 | 含版本 v5.2 + 指向规则页 | PASS |
| H1 | v5 合法签名 → 接受 | 接受 / money300 / 图鉴3 / 警告=False | PASS |
| H2 | v5 去签名 → 拒绝 | 提示含「缺少签名」且进度不变 | PASS |
| H3 | v5 篡改内容保留签名 → 拒绝 | 提示含「校验失败」且进度不变 | PASS |
| H4 | v5 空签名（尾点） → 拒绝 | 提示含「缺少签名」且进度不变 | PASS |
| H5 | v4 降级无签名（满卡 / 超上限） → 接受 | 接受 / money600 / 图鉴56 / 警告=True | PASS |
| H6 | v4 带错误签名 → 拒绝 | 提示含「校验失败」且进度不变 | PASS |
| H7 | v3 无签名 → 接受 | 接受 / money200 / 图鉴2 / 警告=True | PASS |
| H8 | v2 无签名 → 接受 | 接受 / money150 / 图鉴1 / 警告=True | PASS |
| H9 | v6 合法签名（未来版本） → 拒绝 | 提示含「版本 v6 不受支持」且进度不变 | PASS |
| H10 | v0 无签名（越界版本） → 拒绝 | 提示含「版本 v0 不受支持」且进度不变 | PASS |
| I1 | validateSavePayload：非对象（数组） | 提示含「内容不是合法的存档对象」且进度不变 | PASS |
| I2 | validateSavePayload：缺少版本号 | 提示含「缺少版本号」且进度不变 | PASS |
| I3 | validateSavePayload：版本超出上限 | 提示含「版本 v6 不受支持」且进度不变 | PASS |
| I4 | validateSavePayload：缺少卡册数据 | 提示含「缺少卡册数据」且进度不变 | PASS |
| I5 | validateSavePayload：无效卡 ID | 提示含「无效卡 ID」且进度不变 | PASS |
| I6 | validateSavePayload：天数越界 | 提示含「天数超出范围」且进度不变 | PASS |
| I7 | validateSavePayload：生活费为负 | 提示含「生活费数值非法」且进度不变 | PASS |
| I8 | validateSavePayload：碎片超上限 | 提示含「碎片数值非法」且进度不变 | PASS |
| I9 | validateSavePayload：空壳无进度 | 提示含「没有任何可导入的进度」且进度不变 | PASS |
| W1 | v5 合法签名接受且不警告 | 见实测 | PASS |
| W2 | v4 降级无签名：接受 / 决策点与成功弹层均警告 / 收敛 ¥600 | 见实测 | PASS |
| W3 | v2 真实老码接受且警告 | 见实测 | PASS |
| W4 | v3 无签名接受且警告 | 见实测 | PASS |
| W5 | v4 错误签名被拒且进度不变 | 见实测 | PASS |
| W6 | v5 剥离签名被拒且进度不变 | 见实测 | PASS |
| W9 | v4 合法签名接受且不警告 | 见实测 | PASS |
| W10 | 覆盖确认弹层含未签名提示（BUG-14） | 见实测 | PASS |
| W7 | 连续导入：第一次警告 / 第二次不残留 / 第二次生效 | 见实测 | PASS |
| W8 | 取消确认后不误报、下次合法码正常导入 | 见实测 | PASS |
| J1 | 首局提示「初始资金 ¥500 已就位」且不计入收入 | toast 初始资金 / money500 / income0 / dayIncome0 | PASS |
| E1 | 冷加载3次 首屏图片≤4 / 传输≤400KB | ≤4图 / ≤400KB | PASS |
| E2-320x568 | 320x568 保存图片按钮首屏可见 | 按钮在首屏内 / 无横向溢出 | PASS |
| E2-360x640 | 360x640 保存图片按钮首屏可见 | 按钮在首屏内 / 无横向溢出 | PASS |
| E2-360x780 | 360x780 保存图片按钮首屏可见 | 按钮在首屏内 / 无横向溢出 | PASS |
| E2-375x667 | 375x667 保存图片按钮首屏可见 | 按钮在首屏内 / 无横向溢出 | PASS |
| E2-390x844 | 390x844 保存图片按钮首屏可见 | 按钮在首屏内 / 无横向溢出 | PASS |
| E2-414x896 | 414x896 保存图片按钮首屏可见 | 按钮在首屏内 / 无横向溢出 | PASS |
| F1 | 连发4条 toast 最新≤1s可见 | ≤1000ms 且显示 T4 | PASS |
| F2 | 警告类 toast 优先且≤1s可见 | ≤1000ms 且显示 WARN | PASS |
| ALL | 全流程无 pageerror | 0 error | PASS |
