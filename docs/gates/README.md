# 门禁报告（CI 自动同步）

本目录由 GitHub Actions 在门禁跑完后自动写回，**请勿手工编辑**。

| 文件 | 来源 | 说明 |
|---|---|---|
| `v5-gate.md` / `v5-gate-results.json` | `work/regression_v5_gate.py` | v5 回归门禁（A 资金 / B 存档 / C 抽卡 / D 流程 / E 性能 / F 提示 / G 版本 / H 签名矩阵），由 `star7-gate` 工作流在 main 分支 push 后同步 |
| `online-gate.md` / `online-gate-results.json` | `work/online_gate.py` | 线上环境门禁（O1 console / O2 pageerror / O3 4xx-5xx / O4 28 webp / O5 42 mp3 / O6 冷加载 / O7 版本），由 `star7-online-gate` 工作流在 Pages 部署成功后同步 |

报告无时间戳，门禁结果不变时内容逐字节一致，不会产生重复提交；页脚记录了最近一次同步的 Actions run 链接。
