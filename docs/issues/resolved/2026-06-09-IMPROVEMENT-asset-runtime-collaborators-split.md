# 描述
- `AgentAssetRuntime` 单例职责过载: 同时承担状态机、per-project 快照缓存、selector 派生缓存、scope 过滤、worker 协调、SQLite 持久化、watcher 增量折叠、progress 推送。它是所有 IPC 读路径的单一依赖, 改任一块都需理解全部, 测试只能整体 mock。

# 证据
- `src/main/engine/assets/runtime.ts` 单文件聚合上述全部职责; `src/main/ipc/handlers.ts` 的资产/会话/usage/health/search channel 全部经其 selector 读数据。

# 预期 · 建议
- 在已独立的 `SnapshotStore` 之外, 继续抽出协作者: `SelectorCache`、`ProjectSnapshotCache`、`ScanCoordinator`; runtime 只保留状态机 + 编排。
- 约束: 必须保持现有快照 ID 稳定性 (partial 订阅端不重取) 与 scope 无重扫切换语义不变。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-engine-shared-core-package.md (已 RESOLVED, GH-121)。

# 终态 (2026-06-12, RESOLVED — GH-122)
- 三协作者全部出文件 (docs/works/_archive/2026-06-12-gh-122-runtime-collaborators-split, 提交 dff70c01/d70ab540/af33fd44/a1ad5dce), 位于 `packages/berth-scan-engine/src/engine/assets/`:
  - `selector-cache.ts` — SnapshotSelectorCache 纯平移 (原已是独立类, 物理归位) + 直测 3;
  - `project-snapshot-cache.ts` — 5 处裸 Map+projectKey 习语收敛, 归一键内聚 + 直测 4; 持久化谓词 persistIfDefaultView 顺势收敛 ×2;
  - `scan-coordinator.ts` — scanner 生命周期 + in-flight 去重 + **GH-111 R4 代际 guard 内化** (swap 后旧扫描回调全丢, 失败 log 单点无条件) + 直测 5; **链 ③ indexer (长驻 worker/调度背压) 的落点就此就位**。
- runtime 591→491 行, 剩状态机 + ScanSink 数据提交 (commitScan/failScan) + 领域查询门面 + 编排; scanner/inFlight 字段消灭。
- 行为零变更证明: 锚点 24 用例**逐字不动**每步全绿 (快照 ID 稳定/scope 无重扫/R4/P4.6 保序/device-wide health/持久化策略); src/ 消费面全程零改动 (git diff 实证); 全量 1062 双轮 + e2e + 包 24 + dev 双实例真实链路 (切换重扫 → 切回 251ms 缓存命中) + CI success。
- issue 点名的"测试只能整体 mock"痛点解除: 三协作者各有独立直测 (12 断言)。
