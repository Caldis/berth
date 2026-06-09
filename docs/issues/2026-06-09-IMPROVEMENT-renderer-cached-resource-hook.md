# 描述
- 渲染层 stale-while-revalidate 缓存模式在 4 个 hook 中各手写一套 (全局缓存对象 + in-flight 去重 + TTL 新鲜判断 + signature 比对 + reload), 无通用抽象, 每新增数据 hook 即重新发明一遍, 易引入缓存语义漂移与 race/泄漏不一致。

# 证据
- `src/renderer/src/hooks/use-ipc.ts`: 三套 — `healthCheckInFlight`(22)、`sessionListInFlight` Map(41)、`agentCapabilityPluginInFlight`(24); `isHealthCheckCacheFresh`(43)、`isSessionListCacheFresh`(101); TTL 常量 HEALTH/SESSION(12/13)。
- `src/renderer/src/hooks/use-memory.ts`: 第四套 — `memoryListInFlight`(15)、`isMemoryListCacheFresh`(17)、`MEMORY_LIST_CACHE_TTL_MS`(6)。
- 代码库无 `useCachedResource` / 通用 SWR hook。

# 分析 (2026-06-10, 读 4 hook 后修正方案)
- 实读 `useSessions`/`useHealthChecks`/`useAgentCapabilityPlugins`/`useMemory`: 它们**编排层差异远大于表面**, 单个 `useCachedResource` hook 会变成多旋钮过度抽象 (违背简洁优先):
  - **keying**: 仅 `useSessions` 用 Map (per request); 其余单实例。
  - **signature-preserve**: `useSessions`/`useMemory` 有 (保对象身份防重渲染); health/plugins 无。
  - **TTL 新鲜判定**: health/sessions/memory 有; plugins 由 `assetSnapshotId` 变化触发, 无 TTL。
  - **error 通道**: sessions/plugins 有; health 静默吞 (`.catch(() => {})`)。
  - **触发源**: sessions=请求变化; health=挂载 + `assets:onChanged` 软刷新; plugins=`assetSnapshotId`; memory=挂载。
  - **reload/refresh**: sessions=reload(清缓存+in-flight); health=refresh(force); plugins/memory 各异。
- **修正建议**: 不抽"统一 hook"。真正可复用的只是**底层缓存机制** — 抽一个无 React 的 `CachedResource<T>` store (get-if-fresh / request-with-inflight-dedup / set-with-signature-preserve / clearForTests), 各 hook 保留自己的编排但委托缓存机制。收益是消除 TTL/in-flight/signature 三段重复, 风险低于强塞统一 hook。需保 4 个 SWR 测试 (`use-sessions-swr`/`use-health-checks`/`use-memory-cache`/`use-agent-capability-plugins-swr`) 全绿。

# 预期 · 建议
- 抽 `hooks/use-cached-resource.ts`: `useCachedResource<T>(requestFn, key, ttl, signatureFn?)` 统一缓存/去重/TTL/signature/reload; 4 处改为薄封装。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-shared-path-and-type-config.md。
- 状态: OPEN。

# 追记 (GH-115 范围扩大证据, 2026-06-10)
- 第 5 份副本已出现 (GH-114 的 use-agent-teams), 各份失效策略已分叉 (teams 无 TTL / plugins 靠 snapshotId / sessions TTL+signature / health TTL 无 signature)。
- 必须同时带上: 错误维度 (同层 7 hook 中 8 处 .catch 吞掉, 最重者 use-ipc 初始 status/snapshot 失败整应用停 idle 静默空转)、normalize 单点 (usage.summary 双轨: 页面内联过 normalizeUsageSummary 而 hook 版裸用)、统一 resetAllCachesForTests (现 4 个分散 reset; singleFork 跨文件污染已实证, 见 friction 20260610-vitest-flaky)。
- 动手前先写 5 份副本行为差异表并逐差异补钉测; 以 use-agent-teams (最简形) 为首个迁移对象。(01-ANALYSIS R13)
