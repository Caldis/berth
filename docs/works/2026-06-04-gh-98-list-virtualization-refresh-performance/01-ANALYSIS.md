# 需求分析 (Explore 产物)

## 现状理解
涉及 Electron main、preload、renderer 三层:
- `src/main/engine/assets/runtime.ts` 维护中心 `AssetSnapshot` 与 selector cache。`sessions:list` 在 main 侧从 snapshot assets 中过滤、排序、`map(toSessionSummary)` 后返回。
- `src/preload/index.ts` 暴露 `sessions.list`、`memory.list`、`assets.search` 等受控 IPC; renderer 不直接读本地文件。
- `src/renderer/src/pages/sessions.tsx` 对 filtered sessions 做渐进显示, 首批 80 条、每批 120 条, 但最终仍把全部可见 session row 挂载进 DOM。
- `src/renderer/src/components/memory/memory-view.tsx` 对 filtered notes 直接 `notes.map(...)` 全量渲染; 搜索、来源、重要性、标签变化都会重算 visible list。
- `src/renderer/src/pages/instructions.tsx` 的 conventions/skills/subagents/commands/output modes 也对 `filteredAssets.map(...)` 全量渲染。
- `src/renderer/src/hooks/use-ipc.ts` 的 `useSessions()` 有 in-memory stale-while-refresh cache, 但每次进入同 key 页面仍会 `setLoading(true)` 并请求同 key 列表; 返回新数组后无 diff 即 `setSessions(result.sessions)`。
- `src/renderer/src/hooks/use-memory.ts` 无全局 cache / TTL / in-flight dedupe; `MemoryView` 每次挂载都会调用 `memory:list`。

官方 / primary source 校准:
- React Virtuoso `GroupedVirtuoso` 暴露 `computeItemKey`、`groupContent`、`itemContent` 和 group index scrolling API, 符合分组列表场景。来源: https://virtuoso.dev/react-virtuoso/api-reference/grouped-virtuoso/
- TanStack Virtual 是 headless virtualizer, 提供 `getItemKey`、`measureElement`、`scrollToIndex` 等底层能力, 适合作为备选。来源: https://tanstack.com/virtual/latest/docs
- Radix Navigation Menu 是现有 Radix 体系里的无样式导航 primitive, 可用于类目跳转菜单而不引入额外视觉体系。来源: https://www.radix-ui.com/primitives/docs/components/navigation-menu
- React 官方 `useTransition` / `useDeferredValue` 可把非紧急更新设为非阻塞或延后渲染, 适合搜索筛选结果更新。来源: https://react.dev/reference/react/useTransition 与 https://react.dev/reference/react/useDeferredValue
- Electron 官方性能文档要求避免阻塞 main process; CPU-heavy 长任务应使用 worker threads / BrowserWindow / 独立进程。Node worker_threads 官方说明 worker 适合 CPU-intensive JavaScript; MDN Service Worker 说明其运行在 worker context、无 DOM access, 主要控制页面相关请求与缓存。来源: https://www.electronjs.org/docs/latest/tutorial/performance, https://nodejs.org/download/release/v18.20.8/docs/api/worker_threads.html, https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

## 关联与依赖
调用关系:
1. `AppLayout -> useAssets -> AssetRuntime refresh -> worker_threads scan -> snapshot/status`。
2. `Sessions -> useSessions -> sessions:list -> AgentAssetRuntime.listSessions()`。
3. `MemoryView -> useMemory -> memory:list -> listMemory() -> UnitedMemorySource + ClaudeNativeSource`。
4. `Instructions -> useAppStore(assets) -> filterAssetsByAgentView/filterAssetsByAppScope -> filteredAssets.map(card)`。
5. `SearchDialog -> assets:search -> MiniSearch index`, page-local search currently在 renderer 内过滤。

历史设计取舍:
- GH-86 已把扫描迁到 main 侧 worker_threads, 并让 `useSessions()` 有 SWR, 但没有解决最终列表 DOM 全量挂载。
- Sessions 渐进渲染是过渡方案, 只降低首批渲染压力, 不能限制最终 DOM 规模。
- Memory detail 通过 lazy `memory:get` 加载正文, 但 note card 自身仍全部挂载; 展开正文的动态高度与虚拟列表存在测量风险。
- 当前 package 未安装 `react-virtuoso`、`@tanstack/react-virtual`、`@radix-ui/react-navigation-menu`; 需要新增依赖并更新 lockfile。

## 任务分类与 debt 校准
- type / maintenance.subtype: `maintenance / performance` 仍准确。
- source.kind / refs: `docs-issues`, refs 指向 docs issue 与 GH-98。
- debt estimate 修正: 暂不修正。初始估算 `incurred=5, repaid=12, net=-7, scope=global, risk=high, areas=[performance, ui-ux, architecture, testability], confidence=medium` 与现状吻合。
- scope / risk / areas / confidence: 跨 renderer 共享组件、page hook、main selector、第三方依赖与 e2e 视觉验证, 维持 global / high / medium。
- revision: 无。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Sessions 在 800+ 条 session 下最终 DOM 只保留视口内 rows + overscan, 不再挂载全部 session row。
2. Memories 使用同一虚拟列表基础设施; 过滤/search/tag/source 变化时输入保持可响应, 不出现全量卡顿。
3. Instructions 至少覆盖 skills/conventions 中一种大列表路径, 证明共享组件可复用; 未迁移的列表需在 plan 中明确后续范围。
4. 虚拟列表 row key 必须来自稳定业务 id; 滚动期间后台 refresh 不应造成 scroll position、expanded state 或 focused target 明显跳动。
5. 搜索与筛选只更新 row ids / view model, 复用原始 item 对象; 对同结果 refresh 不触发 `setState` 重渲染。
6. 类目跳转侧边菜单能按项目/日期/source/importance/tag 等分组快速定位, 支持键盘访问和当前类目可见状态。
7. 后台刷新有 TTL / in-flight dedupe / request throttle / unchanged-result diff; `useMemory` 不能每次挂载都无条件重拉。
8. 扫描引擎规划需明确边界: 本任务不把本地文件扫描迁到 Service Worker; 如评估搜索索引 worker 化, 只作为后续设计项。
9. UI 字段不回退: Sessions 保留标题、日期、项目/路径、token、cost、模型、duration、agent、loading、empty、refreshing 状态; Memories 保留标题、source、importance、summary、updatedAt、missing、tags、links、path、loading、empty、source unavailable 状态。
10. 测试覆盖虚拟化渲染数量、stable key、scroll/jump navigation、search 输入性能路径、refresh diff/throttle 与至少一个真实 Electron 截图或 DOM 断言。

## 界面质量与交互验收
- 现有结构: sidebar + persistent top nav + page content scroll region。Sessions/Memories 的 search 已在 top nav, 分组/筛选控件在页面顶部。列表条目是低高度工作台式 rows, 信息密度中等偏高。
- 设计系统: Tailwind + lucide icons + Radix primitives; 卡片圆角多为 `rounded-lg`/`rounded-xl`, 需要保持工作台密度, 不引入营销式大卡片。
- 主要用户路径: 从 sidebar 进入 Sessions/Memories/Instructions; 搜索或筛选; 点击类目跳转; 展开条目; 后台 refresh 后继续阅读。
- 可见状态: loading/empty 已有, error 状态较弱。Memory source unavailable 只通过 disabled chip title 暴露, 后续应保持可见但不扩大本任务到完整错误页。
- 交互风险: 虚拟化与展开详情同时存在时, 动态高度会影响测量和滚动定位; Memory 详情建议从列表行内展开转为 drawer/detail panel 或限制测量策略。
- 响应式风险: 类目侧边菜单在窄屏不能挤压主列表; 桌面用右侧/左侧 narrow nav, 移动端改为 sticky compact menu 或 popover。
- 可访问性风险: 虚拟列表需要保持 button semantics、aria-label、keyboard navigation; Radix Navigation Menu 与 list scroll target 的 focus 管理要测试。
- 性能风险: 列表 row 内 i18n、formatter、icons、Markdown body 都会放大渲染成本; row 组件需 memo, body/detail 不应随滚动频繁 mount heavy markdown。

## 未决问题
留给 design 向人澄清。
- 无需用户澄清。Design 阶段需要决定首批迁移范围: Sessions + Memories 为必做; Instructions 可选择 skills/conventions 作为复用证明, 或在 plan 中列为后续任务。
- Design 阶段需要在 `react-virtuoso` 和 `@tanstack/react-virtual` 中定主方案。当前 Explore 倾向 `react-virtuoso`, 因其分组组件更贴合需求。
