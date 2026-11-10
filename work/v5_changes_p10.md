# P10 变更清单（O-21 / O-22 / O-23）

版本保持 `v5.2`：三项均为工程化收尾，不改玩法、资金、存档与产物行为，
`GAME.VERSION` / `SAVE_VER=5` / 抽卡常量 / `__game` 钩子均未动。

## O-21：公开门禁文档补新鲜度 + 陈旧防护

`work/sync_gate_docs.py`
- 新增 `source_fingerprint()`：对 `work/src/*`、`work/regression_v5_gate.py`、`work/online_gate.py`
  的内容做 sha256，取前 12 位作为「源码指纹」。不读 git 历史，因此 shallow clone 与 bot 的
  docs 提交都不会改变它 —— 这是「加新鲜度元数据但不重新引入自激循环」的关键。
- 新增 `product_version()`：从 `02_data.js` 提取 `VERSION`，文档头与产物口径一致。
- 文档头新增两行：`**PASS n / FAIL m**` 之后是 `**产品版本**` + `**源码指纹**`，并注明
  「指纹不变即说明判定针对同一份代码」。不写 run id、时间戳、实测耗时。
- 新增 `write_stale()`：报告或结果 JSON 缺失 / 非法 / 为空时，**用 STALE 正文覆盖旧文档**
  （清除旧结论、写明原因），summary JSON 写 `{"status":"STALE",...}`，并 `exit 1`。
- 行为变化：原实现在缺结果时 `exit 0` 静默跳过，会保留上一次的 PASS；现在改为显式陈旧 + 失败。

`.github/workflows/ci.yml`、`.github/workflows/online-gate.yml`
- 同步步骤去掉 `continue-on-error: true`，STALE 会成为可见的步骤失败（`if: always()` 保留，
  确保即使门禁崩溃也会写陈旧标记）。

`docs/gates/README.md`
- 说明同步内容改为「产品版本 / 源码指纹 / 编号 / 用例 / 期望 / 结果」，并写明 STALE 语义。

## O-22：线上门禁运行列表降噪

`.github/workflows/online-gate.yml`
- 删除 `workflow_run: pages build and deployment (completed)` 触发，只保留
  `deployment_status` + `workflow_dispatch`。原先是同一次部署的两个事件源互相取消，
  每个 commit 产生「1 次实跑 + 1 次 cancelled」，累计 500+ 次运行。
- `concurrency.group` 去掉 `github.event.workflow_run.head_sha` 分支，改为
  `deployment.sha || run_id`；job 的 `if` 同步移除 workflow_run 条件。
- 预期：一次 Pages 部署 → 1 次执行、0 次 cancelled。

## O-23：产物 meta 恢复纯标签

`work/src/00_head.html`
- 去掉 `<meta name="version">` 行尾的构建说明注释（说明只保留在 `build.py` 里）。

`work/build.py`
- 替换正则增加可选注释段 `(?:<!--.*?-->)?`，产物不再残留构建期注释。
- 新增断言：替换后该行必须严格等于 `<meta name="version" content="<GAME.VERSION>">`，
  否则构建中止（防止有人再加回注释或写错行）。

## 实测结果

| 用例 | 期望 | 结果 |
|---|---|---|
| O-23 产物 meta 纯标签 | 该行严格等于 `<meta name="version" content="v5.2">`，无 `<!--` | PASS（build.py 断言通过，产物 grep 无「此值仅为兜底」） |
| O-23 版本可比 | `meta == __game.version == GAME.VERSION == 'v5.2'` | PASS（G1 断言，见回归报告） |
| O-21 幂等 | 连续两次同步后 `/docs/gates/v5-gate.md` 逐字节一致 | PASS（`5E056110678F00FC2952E5D9C82F0CFA` 两次相同） |
| O-21 陈旧防护 | 人为移除 results JSON 时文档不再显示旧 PASS，且步骤失败 | PASS（写入 `STALE · 未取得本次门禁结果`，`exit 1`） |
| O-22 单次部署单次执行 | 一次 Pages 部署只触发 1 次执行、0 次 cancelled | 待 CI 验证（见提交后 run 列表） |
| 回归 | A~H/W 全量断言零回归 | PASS 80 / FAIL 0 |

产物：`outputs/index.html` = 根目录 `index.html`，242,236 B，MD5 `829DF3B72DA3A446D8DF8117673E98AC`
（去掉 91 字节构建注释）。
