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

# 解决记录 (2026-06-11, GH-118)
- **范围实勘修正**: 原文 plugins 链路已被先行修复 (useAgentCapabilityPlugins 自带 error 分支); usage.tsx 页面自有 loadError 处理不属吞错。终表 5 处 = useAssetRuntime 初始链/refresh ×2 + useUsageSummary + useHealthChecks.refresh + useMemory.load。
- **修复**: 4 hook 按 useSessions 样板补 `error` + 重试通道 (SWR 失败保留数据); 消费端条件形态 — app-layout 零数据全屏 ErrorState (sidebar 保留) / 有数据紧凑横幅, overview 用量/健康面板内嵌, memory-view 全页/列表头双形态与空态互斥; 顺修 useHealthChecks 失败 stale 卡死。i18n 新增 4 key (en/zh 对称)。
- **验证**: 11 个错误分支测试 (4 新文件 + 3 扩展), 全量 988 双轮绿; 真机 CDP 回归总览/记忆页 alerts=0; CI success。关联 commit: 72c2546 (T1 usage) / 663bf5c (T2 health) / cf3bd31 (T3 memory) / def1288 (T4 runtime) / 3a871d0 (T5 race fix)。
- 范围外残留: `settings-content.tsx:74` platform.info 组件层降级 (有占位语义, 见 work 01-ANALYSIS 旁支观察, 不立案)。
- 归档: `docs/works/_archive/2026-06-11-gh-118-renderer-error-channels/` (GitHub Issue #118)。
- 状态: RESOLVED (2026-06-11)。
