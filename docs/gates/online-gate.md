# v5.2 线上环境门禁报告

**URL**：https://hlm428.github.io/star7-gacha/

**PASS 8 / FAIL 0**

| 编号 | 用例 | 期望 | 实测 | 结果 |
|---|---|---|---|---|
| O1 | 线上 console error=0 | 0 | [] | PASS |
| O2 | 线上 pageerror=0 | 0 | [] | PASS |
| O3 | 线上 4xx/5xx 响应=0 | 0 | [] | PASS |
| O6 | 冷加载不超过基线 | DCL≤6000ms / load≤8000ms / ≤420KB | {'dcl': 165, 'load': 269, 'bytes': 148281, 'res': 1, 'version': 'v5.2', 'meta': 'v5.2', 'KB': 144.8} | PASS |
| O4a | 本地资产清单完整 | webp28 / mp3:42 | {'webp': 28, 'mp3': 42} | PASS |
| O4 | 28 张 webp 真实解码成功 | 28/28 | {'ok': 28, 'bad': []} | PASS |
| O5 | 42 个 mp3 可达且 MIME 正确 | 42/42 audio/mpeg\|audio/mp3 | {'ok': 42, 'bad': []} | PASS |
| O7 | 线上版本与 meta 一致为 v5.2 | v5.2 / v5.2 | {'hook': 'v5.2', 'meta': 'v5.2'} | PASS |
---
最近更新：CI 自动同步 · run https://github.com/hlm428/star7-gacha/actions/runs/42732064235
