# 描述
- 渲染层 stale-while-revalidate 缓存模式在 4 个 hook 中各手写一套 (全局缓存对象 + in-flight 去重 + TTL 新鲜判断 + signature 比对 + reload), 无通用抽象, 每新增数据 hook 即重新发明一遍, 易引入缓存语义漂移与 race/泄漏不一致。

# 证据
- `src/renderer/src/hooks/use-ipc.ts`: 三套 — `healthCheckInFlight`(22)、`sessionListInFlight` Map(41)、`agentCapabilityPluginInFlight`(24); `isHealthCheckCacheFresh`(43)、`isSessionListCacheFresh`(101); TTL 常量 HEALTH/SESSION(12/13)。
- `src/renderer/src/hooks/use-memory.ts`: 第四套 — `memoryListInFlight`(15)、`isMemoryListCacheFresh`(17)、`MEMORY_LIST_CACHE_TTL_MS`(6)。
- 代码库无 `useCachedResource` / 通用 SWR hook。

# 预期 · 建议
- 抽 `hooks/use-cached-resource.ts`: `useCachedResource<T>(requestFn, key, ttl, signatureFn?)` 统一缓存/去重/TTL/signature/reload; 4 处改为薄封装。

# 来源 · 关联
- 架构图绘制任务 (2026-06-09)。关联 2026-06-09-IMPROVEMENT-shared-path-and-type-config.md。
- 状态: OPEN。
