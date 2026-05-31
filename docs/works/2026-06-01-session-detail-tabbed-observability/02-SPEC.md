# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

- 不新增 IPC channel。
- 不修改 `SessionDetailResult` 必填字段。
- tab 计数从现有数据推导:
  - Overview: `skillsUsed.length + mcpServers.length + hooksFired.length + signalAttentionCount`。
  - Timeline: `toolTimeline.length`。
  - Artifacts: `plans.length + todos.length + files.length + checkpointCount`。
- `signalAttentionCount` 首版只在渲染层计算:
  - `failedCount > 0` 算 1。
  - `slowestTool != null` 算 1。
  - `cacheReadShare != null && cacheReadShare > 0.5` 算 1。
  - 这个计数只用于 tab badge, 不改变 IPC。

## 页面结构

在 `src/renderer/src/pages/session-detail.tsx` 内引入 Radix Tabs primitive:

- `import * as Tabs from '@radix-ui/react-tabs'`
- 新增 `type SessionDetailTab = 'overview' | 'timeline' | 'artifacts'`
- `SessionDetail` 里维护 `activeTab`, 默认 `'overview'`。
- breadcrumb/title 继续常驻在页面顶部。
- tab bar 放在 title 下方, 采用工作型 segmented control:
  - 每个 tab 包含图标、label、count badge。
  - 当前 tab 使用清晰边框/背景, 不使用强装饰渐变。
  - mobile 下横向可滚动的是 tab list 自身, 内容区域不能出现横向滚动条。

## 内容拆分

### Overview / Signals tab

包含:

- `SessionSummaryPanel`
- `SessionSignalsPanel`
- Loaded assets 区块

布局:

- 桌面: 上方 summary 全宽; 下方 `SessionSignalsPanel` 与 Loaded assets 两列。
- 窄屏: 单列。
- Loaded assets 继续使用 `CollapsibleSection`, 默认展开 skills/mcp/hooks。

### Tool Timeline tab

包含:

- 工具时间线卡片和 `ToolTimeline`。

布局:

- 独占完整内容宽度。
- `ToolTimeline` 保留 `max-h-[720px] overflow-y-auto overflow-x-hidden`。
- 筛选栏保持顶部, 因为用户进入此 tab 通常就是为了定位慢工具或失败工具。
- 不把 session signals 放在右侧, 避免挤压 timeline 证据列。

### Artifacts tab

包含:

- plans
- todos
- files
- checkpoints

布局:

- 独占完整内容宽度。
- files 行继续使用 `truncatePath(file.path, 96)` 及 `font-mono`。
- Checkpoints 继续使用上一轮摘要规则: 无文件明细时显示摘要和可展示字段, 不逐条刷空记录。

## 组件拆分

首版保持文件内局部组件, 避免把单页重排扩大成跨模块重构:

- 新增 `SessionDetailTabs`
  - 输入: activeTab、onValueChange、counts。
  - 输出: Radix `Tabs.List` 和 `Tabs.Trigger`。
- 新增 `SessionOverviewTab`
  - 输入: detail、signals、loadedAssetCount、expandedSections、toggleSection。
- 新增 `SessionTimelineTab`
  - 输入: toolTimeline。
- 新增 `SessionArtifactsTab`
  - 输入: artifacts、artifactCount、checkpointCount、expandedSections、toggleSection。
- 保留已有 `SessionSummaryPanel`、`SessionSignalsPanel`、`ToolTimeline`、`CheckpointsContent`。

如果实现后 `session-detail.tsx` 明显超过可维护长度, 再在后续任务提取子组件; 本任务不主动做跨文件抽象。

## i18n

新增 key:

- `sessions.tabs.overview`
- `sessions.tabs.timeline`
- `sessions.tabs.artifacts`
- `sessions.tabs.overviewDescription`
- `sessions.tabs.timelineDescription`
- `sessions.tabs.artifactsDescription`

中英文都要补齐。测试中避免依赖中文 copy, 用英文 fixture 断言主要文本即可。

## 可访问性与交互

- Radix Tabs 自带键盘切换基础行为。
- tab trigger 使用 `aria-label` 或可见文本包含 label 和 count。
- `Tabs.Content` 不卸载内容时会导致 hidden 内容仍被测试查询到; 本任务建议只渲染当前 tab 内容, 或使用 `forceMount` 时确保隐藏内容有 `hidden` 且测试按可见性查询。
- 视觉上 tab bar 不贴页面边缘, 与内容区保持 12-16px 节奏。

## 测试策略

- `tests/renderer/sessions-pages.test.tsx`
  - 默认进入详情页后能看到 Run overview / Session signals / Loaded Assets, 看不到 Tool Timeline 的事件行和 Artifacts 的文件行。
  - 点击 Timeline tab 后能看到 Tool Timeline、失败筛选、耗时 slider、工具事件; 不再同时显示 Artifacts 文件行。
  - 点击 Artifacts tab 后能看到 plans/todos/files/checkpoints; 文件路径占用全宽内容区域。
  - 保留现有失败工具筛选和耗时 slider 测试, 但先切到 Timeline tab 后再断言。
  - 保留 checkpoint 摘要测试, 但先切到 Artifacts tab 后再断言。
- 验证命令:
  - `pnpm test -- tests/renderer/sessions-pages.test.tsx`
  - `pnpm typecheck:web`
  - `pnpm harness:check`
- 视觉验收:
  - 用 `pnpm dev:agent` 启动 agent-owned 实例。
  - 截图核对 overview/timeline/artifacts 三个 tab。
  - Timeline tab 重点看无横向滚动条和密度; Artifacts tab 重点看文件路径不被右栏挤压。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Radix Tabs + 默认 overview | 1, 5, 7 |
| Timeline 独占宽度并保留筛选 | 2, 8 |
| Artifacts 独占宽度并保留 checkpoint 摘要 | 3, 8 |
| tab count badge | 4 |
| 不改 IPC 契约 | 6 |
| renderer 测试与视觉验收 | 7, 8, 9 |
