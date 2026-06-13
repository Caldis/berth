# Explore — 搜索快捷键冲突

## 现状理解

这是 renderer 内部键盘交互问题, 不涉及主进程 IPC 契约变更。

现有链路:

1. 左侧边栏的全局搜索入口在 `src/renderer/src/components/layout/sidebar.tsx`, 使用 `SearchTriggerButton`, 快捷键提示来自 `searchShortcutLabel(isMac)`。
2. 全局搜索弹窗在 `src/renderer/src/components/layout/search-dialog.tsx`, 监听 `window keydown`。当前 `(metaKey || ctrlKey) && key === "k"` 时会先调用 `focusPageSearch()`, 如果当前页面注册了页内搜索, 就不打开全局搜索。
3. 页面顶部 header 搜索在 `src/renderer/src/components/layout/top-navigation.tsx`, 使用同一个 `searchShortcutLabel(isMac)` 展示快捷键提示, 并通过 `useRegisterPageSearchFocus()` 把 focus handler 注册到 `PageChromeProvider`。
4. 页面搜索配置来自 `PageChromeSearch`, 由会话、记忆、指令、能力等页面提供 placeholder / value / onValueChange。

实际结果: 有页内搜索的页面中, Ctrl/⌘K 不再打开全局搜索, 而是聚焦页内搜索; 同时侧栏和 header 都显示同一个快捷键, 用户无法从 UI 判断哪个入口会被触发。

## 关联与依赖

- 全局搜索: device-wide asset search, 入口是侧栏按钮和 SearchDialog, 应保留较高优先级快捷键 Ctrl/⌘K。
- 页内搜索: 当前页面列表过滤, 入口是 TopNavigation 的 `ChromeSearchInput`, 应使用不同快捷键并只聚焦当前页内输入框。
- `search-control.tsx` 目前只有一个 label helper, 需要区分 global/page 两类快捷键文案。
- `PageChromeProvider` 的 focus handler 仍有价值: TopNavigation 和测试可以继续复用, 但 SearchDialog 不应再用 Ctrl/⌘K 抢先转发到页内搜索。

符号影响边界:

- `searchShortcutLabel` 使用点: `sidebar.tsx`、`search-dialog.tsx`、`top-navigation.tsx`、`top-navigation-search.test.tsx`。
- Ctrl/⌘K 行为测试: `top-navigation.test.tsx`、`sessions-pages.test.tsx`、`memory-view.test.tsx`。
- SearchDialog 自身测试需要补全“全局快捷键打开全局弹窗”的行为。

## 任务分类与 debt 校准
- type: `bug` 准确。
- source.kind: `user-request` 准确。
- debt estimate: `net=2`, `scope=module`, `risk=medium`, `areas=[ui-ux,testability]` 准确。影响集中在 renderer layout/search 组件和相关测试, 不涉及 IPC 或数据层。

## 验收标准

AC-1. 左侧边栏全局搜索继续显示并使用 Ctrl/⌘K; 在存在页内搜索的页面按 Ctrl/⌘K 应打开全局搜索弹窗, 不聚焦页内搜索。

AC-2. 页面顶部 header 页内搜索显示并使用不同快捷键, 建议为 Ctrl/⌘+Shift+K; 触发后只 focus/select 页内搜索输入框, 不打开全局搜索弹窗。

AC-3. macOS 与 Windows/Linux 快捷键文案区分正确: 全局 `⌘K` / `Ctrl+K`, 页内 `⇧⌘K` / `Ctrl+Shift+K`。

AC-4. 会话页、记忆页等依赖页内搜索快捷键的测试改为新快捷键, 过滤行为不回退。

AC-5. 无页内搜索的页面按 Ctrl/⌘K 仍可打开全局搜索弹窗。

## 界面质量与交互验收

- 页面结构不变: 左侧边栏保留全局搜索触发按钮, 顶部 header 保留页内搜索输入框。
- 设计系统不变: 继续使用 `ChromeSearchInput` / `SearchTriggerButton` 和 HeroUI `Kbd`。
- 可见状态: 两个快捷键提示必须在各自入口旁显示, 不能继续相同。
- 交互反馈: 新快捷键触发后应直接 focus/select 对应输入框; 不新增弹层或说明文案。
- 响应式: 现有 `Kbd` 在 header 搜索输入框中 md 以上可见, 本轮只改文本。
- 可访问性: aria-label 保持搜索 placeholder/label, 不把快捷键文本拼进 aria-label。

## 未决问题

无需要用户澄清的问题。采用保守方案: 全局保留 Ctrl/⌘K, 页内改为 Shift 组合键。
