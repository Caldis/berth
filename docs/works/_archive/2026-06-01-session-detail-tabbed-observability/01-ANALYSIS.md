# 现状分析 (Explore 产物)

## 现状理解

会话详情页入口是 `src/renderer/src/pages/session-detail.tsx`。渲染层通过 `useSessionDetail(id)` 调用 `window.api.sessions.get(id)`, 主进程返回 `SessionDetailResult`。当前任务不需要新增 IPC, 主要是重排同一份详情数据。

当前页面结构是单页纵向堆叠:

1. 顶部 breadcrumb 和标题。
2. `SessionSummaryPanel`: 运行概览、模型 hover 信息、token breakdown、开始时间。
3. 两栏主体:
   - 左侧 `ToolTimeline`: 工具时间线、失败筛选、耗时 slider、高密度列表。
   - 右侧 `SessionSignalsPanel` 和加载资产区。
4. 全宽 `Artifacts`: plans、todos、files、checkpoints。

上一轮已经解决的问题包括: 工具耗时、失败筛选、无横向滚动、模型资费 tooltip、checkpoint 空明细摘要、产物全宽展示。新任务不应回退这些能力, 而是用 tab 把信息分层。

## 关联与依赖

- `src/shared/types/ipc.ts`
  - `SessionDetailResult` 已包含 summary、modelInfo、skillsUsed、mcpServers、hooksFired、toolTimeline、artifacts、fileHistoryCount。
  - tab 改造只消费这些字段, 不改变主进程契约。
- `src/renderer/src/pages/session-detail.tsx`
  - 当前所有 detail 子组件都在同一文件中, 适合先在本文件内重排, 不必先做跨文件抽象。
  - `expandedSections` 同时服务 loaded assets 和 artifacts。tab 改造后仍可保留同一个 Set, 但默认展开项应按 tab 场景重新确认。
  - `buildSessionSignals(detail)` 已是纯函数, 可继续在 Overview tab 内使用。
- `tests/renderer/sessions-pages.test.tsx`
  - 已覆盖详情元数据、工具筛选、checkpoint 摘要、工具说明。
  - tab 改造必须补充切换 tab 的测试, 并确认默认 tab 不隐藏核心概览。
- 依赖层:
  - `package.json` 已有 `@radix-ui/react-tabs`, 但当前代码没有 Tabs wrapper。可直接在页面内用 Radix primitive, 或补一个很小的 `components/shared/tabs`。为保持改动窄, 本任务优先在 `session-detail.tsx` 内使用 Radix primitive。
- i18n:
  - 需要新增 tab label、tab badge、tab empty/summary 文案到 `en.json` 和 `zh.json`。

## 信息架构判断

建议的三个一级 tab:

1. Overview / Signals
   - 保留 `SessionSummaryPanel`。
   - 合并 `SessionSignalsPanel`。
   - 放入 loaded assets, 因为 skills/MCP/hooks 更像运行上下文, 不是产物。
   - 可以新增“需要注意”的小摘要, 例如失败工具数、最慢工具、缓存读占比异常, 但首版不扩大数据契约。
2. Tool Timeline
   - 独占完整宽度, 让 100+ 工具调用有足够横向空间。
   - 保留失败筛选、耗时 slider、工具 tips、连续 rail 和无横向滚动约束。
   - 适合后续增加工具类型筛选、慢工具分布、失败原因聚合。
3. Artifacts
   - 独占完整宽度。
   - 保留 plans、todos、files、checkpoints。
   - 适合后续增加文件操作分组、checkpoint diff/路径明细、产物检索。

布局上, 顶部 breadcrumb/title 应继续常驻。tab bar 应位于 title 下方, 作为页面主导航。每个 tab 内容需要独立处理空态, 不能因为切 tab 后内容少而出现大块空白。

## 验收标准

1. 默认进入会话详情时打开 Overview tab, 用户能看到运行概览、会话信号和加载资产。
2. Tool Timeline tab 只展示工具时间线相关内容, 并保留失败筛选、耗时 slider、工具 tips、连续 rail、无横向滚动。
3. Artifacts tab 只展示 plans、todos、files、checkpoints, 并保持全宽文件路径展示。
4. tab label 上显示对应计数: overview 使用信号/上下文聚合计数, timeline 使用工具数, artifacts 使用产物数。
5. tab 切换可通过鼠标和键盘访问; 当前 tab 有清晰选中状态。
6. 不新增或破坏 IPC 契约; `SessionDetailResult` 字段继续兼容旧 fixture。
7. renderer 测试覆盖默认 tab、切换 timeline、切换 artifacts, 并断言隐藏 tab 的内容不会同时挤在页面上。
8. 视觉验收需要在真实 Electron 页面确认: 宽屏无横向滚动, tab bar 不贴边, 100+ 工具调用时 timeline 仍可扫描, artifacts 文件路径不被压到右侧窄栏。
9. 验证命令至少包括 `pnpm test -- tests/renderer/sessions-pages.test.tsx`, `pnpm typecheck:web`, `pnpm harness:check`。

## 未决问题

无阻断性问题。设计默认采用用户提出的三 tab 结构, 且默认 tab 为 Overview / Signals。
