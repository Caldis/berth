# 需求分析 (Explore 产物)

> GH-118, 2026-06-11。吞错点终表已实勘 (issue 原文行号/内容已漂移, 以本表为准)。

## 现状理解 — 吞错点终表 (5 处, 全在 renderer hooks 层)

| # | 位置 | hook | 失败影响 | 消费端 (符号边界) |
|---|---|---|---|---|
| 1 | `use-ipc.ts:156` | `useAssetRuntime` 初始链 (status→snapshot→条件 refresh) | **最重**: store 停 idle 空数据, 全部资产页 (总览/约定/技能/能力/指令) 静默空界面 | `app-layout.tsx:58` 顶层唯一挂载 (经 `useAssets`) |
| 2 | `use-ipc.ts:138` | `useAssetRuntime.refresh` | 手动/自动重扫失败无反馈 | 同上 + 各页 refresh 按钮 |
| 3 | `use-ipc.ts:396` | `useUsageSummary` | overview 用量面板空数据无错误 (loading 结束后 usage=null) | `overview.tsx:58` (UsageSnapshotPanel) |
| 4 | `use-ipc.ts:437` | `useHealthChecks.refresh` | 健康检查空/停旧值; **附带 bug: 失败时 `stale` 不复位, 卡 true** | `overview.tsx:59` (HealthWorklistPanel) + `hooks-lifecycle-view.tsx:79` (HookHealthSignal) |
| 5 | `use-memory.ts:65` | `useMemory.load` | 记忆页空态与"真无记忆"不可区分; instructions 记忆区块静默缺数据 | `memory-view.tsx:666` (主) + `instructions.tsx:432` (次级, 只读 result) |

### issue 原文与现状的差异 (探明)
- 原文 "plugins 链路" 已被先行修复: `useAgentCapabilityPlugins` 现有完整 error 分支 (`use-ipc.ts:516-528`), settings-content.tsx 已消费 `agentPluginsError`。本任务不再含 plugins。
- `usage.tsx` 页面自有 fetch (`usage.tsx:301-327`) 已有 `loadError` + reload 处理, 不属吞错; 吞错的是 overview 消费的 `useUsageSummary`。

## 既有样板 (同仓, 直接对齐)
- **hook 模式**: 同文件 `useSessions` (`use-ipc.ts:191-268`) — `error: string | null` + `reload()` (invalidate 缓存 + nonce 重触发) + 失败保留已有数据 (SWR 语义, catch 不清 sessions)。`useSessionDetail` / `useSessionReplay` 同款。
- **UI 组件**: `components/shared/error-state.tsx` — HeroUI Alert (danger/faded) + 可选 onRetry 按钮, `role=alert`; 已消费于 sessions / session-detail / session-replay / teams 四处, 视觉先例已验收 (GH-110)。
- **测试模式**: `tests/renderer/session-error.test.tsx` — `renderHook` + `mockRejectedValueOnce` → `waitFor(error)` → `act(reload)` → recover, 断言重调次数。
- **缓存原语**: `CachedResource` 不需改 (error 在 hook 编排层处理; `request()` 失败时 inflight 清除、缓存不写入, 重试天然可行)。

## 关联与依赖
- `useAssetRuntime` 是全局数据根: 初始失败 = 整应用不可用, error 呈现需在 `app-layout` 级 (设计点 1)。
- `useHealthChecks` 双消费 (overview + hooks-lifecycle-view), error 通道加进 hook 后两处消费端按需渲染; 软刷新 (`onChanged` 触发) 失败时已有数据保留, error 可观测即可 (不打断浏览)。
- i18n: ErrorState 调用处需 title/desc 双语 key (en/zh 对称)。
- 旁支观察 (不属本任务, 不顺手修): `settings-content.tsx:74` `platform.info().catch(() => {})` 属组件层低危降级 (About 面板有占位语义), 非 hooks 层; `capabilities.tsx:931` 只取 plugins 丢弃 error (error 主消费在 settings 已可见)。均不立 issue: 前者有降级语义, 后者有主消费点。

## blast radius (符号边界)
- 改动文件: `use-ipc.ts` (3 个 hook 编排) + `use-memory.ts` (1 个 hook) + 消费端 4 文件 (`app-layout.tsx` / `overview.tsx` 或其 panel 组件 / `memory-view.tsx` / 视设计 `hooks-lifecycle-view.tsx`) + en/zh.json + 测试 3-4 文件。
- hook 返回签名扩展 (新增 error/retry 字段) 为加法变更, 既有解构消费端不破坏 (TS 结构兼容); `useAssets` 透传层可能随之扩展。
- 不动: CachedResource 原语、main 进程、IPC 契约、sessions 族 hook (已达标)。

## 任务分类与 debt 校准
- type / maintenance.subtype: maintenance / ui-ux 维持。
- source.kind / refs: docs-issues 维持。
- debt estimate 修正: 数值维持 (incurred 1 / repaid 3 / net -2); **confidence medium→high** (5 处吞错点、样板、消费面全部实勘; plugins 已先行做掉使范围更小)。
- scope / risk / areas: module / medium / [ui-ux] 维持 (hook+消费端多页渲染面)。
- revision: 已追加 `debt.revisions[0]` (1.0-explore)。

## 验收标准
1. **AC-1**: 5 处吞错点全部接 error 通道 — 各 hook 对外暴露 `error: string | null` 与重试入口 (reload/refresh), 失败时保留已有数据 (SWR 语义, 对齐 useSessions); 重试成功后 error 清空。
2. **AC-2**: 消费端渲染 — ① `useAssetRuntime` 初始链失败: app-layout 级 ErrorState + 重试 (形态由设计点 1 定); ② overview 用量/健康面板失败: 面板内错误反馈 + 重试; ③ memory-view 失败: ErrorState 与空态明确区分 + 重试; ④ instructions 次级消费不要求错误 UI (假设, 见未决 1 备注)。
3. **AC-3**: `useHealthChecks` 失败时 `stale` 复位 (不卡 true)。
4. **AC-4**: 每个改动 hook 有错误分支 renderer 测试 (reject → error → retry → recover), 模式对齐 session-error.test.tsx; 消费端 ErrorState 渲染各有至少一条断言 (`role=alert` / testid)。
5. **AC-5**: 新增文案 en/zh key 对称。
6. **AC-6**: 真机回归 — 正常路径各受影响页面渲染无回归; 错误态本身以 jsdom renderer 测试为证据 (CDP 不能 stub contextBridge, jsdom 可 — friction 20260610-cdp-cannot-stub-contextbridge)。

## 界面质量与交互验收
- 错误态组件复用 `ErrorState` (HeroUI Alert danger/faded + retry Button), 与 sessions 页既有视觉完全一致, 不新增视觉语言。
- 布局: overview 面板内错误反馈不破坏 grid 双栏布局 (替换面板内容区, 保留面板标题); memory-view 全页 ErrorState 用 fullHeight; app-layout 级形态由 design 定 (内容区全屏 vs 横幅)。
- 状态区分: 错误态 (ErrorState) ≠ 空态 (EmptyState) ≠ 加载态 (Loader2/skeleton) 三态边界清晰; SWR 下"有旧数据 + 后台刷新失败"不清屏, 错误以非阻断形态呈现。
- 交互反馈: 重试按钮触发后回到 loading 态; 重试成功 error 消失。
- i18n: 全部新文案双语; 可访问性: ErrorState 自带 `role=alert`。

## 未决问题 (design 定夺, 均为 Agent 可自决的工程细节)
1. **useAssetRuntime 初始失败的呈现形态**: 倾向 app-layout 内容区全屏 ErrorState (sidebar 保留可导航) — 无资产数据时各页无意义, 全屏重试最直接; 备选: 顶部横幅不挡内容。instructions 次级 memory 消费不做错误 UI (memory 主页有完整入口)。
2. **软刷新/手动 refresh 失败 (有旧数据) 的呈现**: 倾向保留旧数据 + 非阻断错误指示 (面板内紧凑行), 对齐 SWR 不清屏原则。design 给出每处具体形态。
3. **overview 面板错误渲染层级**: 倾向 panel 组件内 (UsageSnapshotPanel / HealthWorklistPanel 接 error prop), 页面布局结构不动。
