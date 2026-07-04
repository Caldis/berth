# IMPROVEMENT: watcher 路径集在启动时以 existsSync 定死, 后建目录成监听盲区

状态: OPEN (中优, 非阻塞)

## 现象

`packages/berth-scan-engine/src/engine/watcher.ts:128-138` — watch 路径集合在 `start()` 时按 `existsSync` 过滤一次定死。`~/.codex/sessions`、`managed-settings.json` 等目录/文件若在 watcher 启动**之后**才创建 (如用户后装 Codex、企业策略后落盘), 其变更在下一次 watcher `restart` (项目切换触发) 之前没有 live 更新, 期间只靠周期全量扫描兜底 (默认 24h, 且受 idle/battery gate 推迟)。

与产品 "spotlight 式, 看不到=没有" 的期望有落差: 新装 agent 的资产要等很久才出现。

## 修复方向 (设计面较大, 独立任务)

- 对启动时不存在的条件路径, 监听其**最近存在的父目录**, 出现后升级为直接监听; 或
- 周期性 (如每次周期扫描后) 重评估 watch 集合, 增量补挂新出现的根。
- 注意与 `restart` (项目切换) 的生命周期交互, 以及 chokidar 对不存在路径的行为差异。

## GH-155 追记 (2026-07-04, deep-index design 裁决 Q2: 不入批)

- 裁决理由: 把全部 deep 项目挂进 chokidar watch 集 = 数百根句柄资源不可控, 且与 active-only watch 生命周期 (activate 触发 restart) 冲突; 时效由队列 revalidation + 24h 周期扫兜底, 符合产品决策①「渐进, 不承诺时限」。
- **新观察面**: GH-155 落地后, 非活动项目被后台 deep-index 进 [全局], 但其文件树**仍不在 live watch 集** — deep 行的变更 (增/删/改) 要等下一次全量扫 commit 后的队列 revalidation 轮才反映。修复本 issue 时 (周期扫描后重评估 watch 集), deep-indexed 项目根是天然的增量补挂候选清单 (`snapshot.projectCandidates` 已含)。

## 来源

2026-07-04 综合审查健壮性发现 #12 (低危); GH-152 explore 阶段按不变量 10 建档, 不入该批 (`docs/works/_archive/2026-07-04-gh-152-audit-p2-engine-robustness/01-ANALYSIS.md` 交叉引用)。
