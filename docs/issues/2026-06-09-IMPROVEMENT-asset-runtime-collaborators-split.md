# 描述
- `AgentAssetRuntime` 单例职责过载: 同时承担状态机、per-project 快照缓存、selector 派生缓存、scope 过滤、worker 协调、SQLite 持久化、watcher 增量折叠、progress 推送。它是所有 IPC 读路径的单一依赖, 改任一块都需理解全部, 测试只能整体 mock。

# 证据
- `src/main/engine/assets/runtime.ts` 单文件聚合上述全部职责; `src/main/ipc/handlers.ts` 的资产/会话/usage/health/search channel 全部经其 selector 读数据。

# 预期 · 建议
- 在已独立的 `SnapshotStore` 之外, 继续抽出协作者: `SelectorCache`、`ProjectSnapshotCache`、`ScanCoordinator`; runtime 只保留状态机 + 编排。
- 约束: 必须保持现有快照 ID 稳定性 (partial 订阅端不重取) 与 scope 无重扫切换语义不变。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-engine-shared-core-package.md。
- 状态: OPEN。
