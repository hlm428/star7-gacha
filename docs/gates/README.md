# 门禁报告（CI 自动同步）

本目录由 GitHub Actions 在门禁跑完后自动写回，**请勿手工编辑**。

| 文件 | 来源 | 说明 |
|---|---|---|
| `v5-gate.md` / `v5-gate-summary.json` | `work/regression_v5_gate.py` | v5 回归门禁（A 资金 / B 存档 / C 抽卡 / D 流程 / E 性能 / F 提示 / G 版本 / H 签名矩阵 / W 兼容），由 `star7-gate` 在 main 分支 push 后同步 |
| `online-gate.md` / `online-gate-summary.json` | `work/online_gate.py` | 线上环境门禁（O1 console / O2 pageerror / O3 4xx-5xx / O4 28 webp / O5 42 mp3 / O6 冷加载 / O7 版本），由 `star7-online-gate` 在 Pages 部署成功后同步 |

公开文档只保留「编号 / 用例 / 期望 / 结果」，剔除逐次波动的实测值（如冷加载耗时），因此门禁结论不变时文件内容逐字节一致，写回步骤 diff 为空、不产生重复提交。需要看每次的实测明细，请到对应 Actions run 的 Summary 或下载 artifact。

最近一次同步对应的 run 链接记录在该次 `docs(gates): ...` 提交的 commit message 里。
