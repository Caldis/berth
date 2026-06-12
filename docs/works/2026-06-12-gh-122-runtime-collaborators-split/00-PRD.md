# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- `docs/issues/2026-06-09-IMPROVEMENT-asset-runtime-collaborators-split.md` (快照于 2026-06-12, 0.0-new)
- GitHub Issue: https://github.com/Caldis/berth/issues/122
- 用户指令: 重构链按序执行, 本任务为链 ② (① GH-121 engine 成包已归档, 运行时位于 packages/berth-scan-engine/src/engine/assets/runtime.ts); 完成后推送。
- 链依据 (2026-06-11 用户确认的排序分析): 拆出 ScanCoordinator 是链 ③ indexer 主线 (长驻 worker/调度背压) 的落点前置 — 不先拆, worker 重设计逻辑只能继续糊进 runtime 单体。

## 正文

# 描述
- `AgentAssetRuntime` 单例职责过载: 同时承担状态机、per-project 快照缓存、selector 派生缓存、scope 过滤、worker 协调、SQLite 持久化、watcher 增量折叠、progress 推送。它是所有 IPC 读路径的单一依赖, 改任一块都需理解全部, 测试只能整体 mock。

# 证据
- `src/main/engine/assets/runtime.ts` 单文件聚合上述全部职责; `src/main/ipc/handlers.ts` 的资产/会话/usage/health/search channel 全部经其 selector 读数据。
- (2026-06-12 注: GH-121 后物理路径为 `packages/berth-scan-engine/src/engine/assets/runtime.ts`, 职责现状不变。)

# 预期 · 建议
- 在已独立的 `SnapshotStore` 之外, 继续抽出协作者: `SelectorCache`、`ProjectSnapshotCache`、`ScanCoordinator`; runtime 只保留状态机 + 编排。
- 约束: 必须保持现有快照 ID 稳定性 (partial 订阅端不重取) 与 scope 无重扫切换语义不变。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-engine-shared-core-package.md (已 RESOLVED, GH-121)。
- 状态: OPEN。

## GH-121 终态遗留的同窗残项 (resolved issue 终态指定链 ② 处理/复核)
- adapter scanAll 接 sources 表、conventions 双表收敛、session 解析 capability map 契约化 (ARCHITECTURE 例外清单在册)。
- tsup publishConfig / 桶导出 / exports 子路径发布形态。
- watcher resolveClaudeManagedDir 中立化、project-scope-runtime 归位 (R33) — explore 复核定纳入与否。
