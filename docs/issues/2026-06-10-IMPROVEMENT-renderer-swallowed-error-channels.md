# 描述
- renderer hooks 层仍有多处 `.catch(() => {})` 静默吞错: `use-ipc.ts` 4 处 (131/149/329/370, 含 health 软刷新与 plugins 链路) + `use-memory.ts` 1 处; 最重者为 useAssetRuntime 初始 status/snapshot 拉取失败时整应用停在 idle 静默空转, 用户只见空界面无任何错误提示。
- sessions/session-detail 已由 GH-110 P4.3 立样板 (error+reload 通道 + 共享 `ErrorState` (HeroUI Alert+Button) + 错误态/空态区分 + 重试), 其余 hook 未跟进。

# 重现步骤
1. 模拟主进程 IPC handler reject (如 assets:status 抛错)。
2. 启动 renderer, 观察总览/健康/记忆/插件页。

# 预期结果
- 初始链路失败渲染 ErrorState + 重试动作; 软刷新失败至少在健康面板/日志可见。

# 实际结果
- 失败被吞, 页面停留空态/旧态, 无重试入口。

# 解决方案
- 按 GH-110 样板逐 hook 补 error 通道: useAssetRuntime (初始 status/snapshot, 最高优先) → useHealthChecks → useAgentCapabilityPlugins → useMemory; 页面渲染共享 ErrorState。
- CachedResource 原语已统一 5 处缓存 (2026-06-10), error 通道可在各 hook 编排层补, 不需改原语。
- 每个 hook 补错误分支 renderer 测试 (参照 tests/renderer/session-error.test.tsx)。

# 来源 · 关联
- 自 [[2026-06-09-IMPROVEMENT-renderer-cached-resource-hook]] (2026-06-10 RESOLVED) 追记的错误维度拆出, 原始证据为 GH-115 01-ANALYSIS R13 (8 处 .catch 吞掉)。
- 样板: docs/issues/resolved/2026-06-05-IMPROVEMENT-session-error-channel.md (GH-110 P4.3, 提交 2b90b7c1)。
- 状态: OPEN。
