# 需求分析 (Explore 产物)

## 现状理解

本任务只涉及 renderer UI, 不改主进程、preload 或 IPC 契约。

相关链路:
- App shell: `AppLayout -> Sidebar + TopNavigation + main[app-content-scroll]`。
- Header 指南: `TopNavigation` 从 `useCurrentPageChrome()` 读取 `pageChrome.guide`, hover `HelpCircle` 按钮后在 header 内部渲染 `FeatureGuidePanel`。
- Hooks 检查: `Capabilities(activeSection=hooks) -> HooksLifecycleView -> useHealthChecks() -> HookHealthSignal -> HealthStatusTip`。

当前层级:
- `Sidebar` 是 `fixed left-0 top-0 z-30`。
- `TopNavigation` 在内容列内, 是 `absolute inset-x-0 top-0 z-20`。
- Header 指南浮层是 `TopNavigation` 内部的 `absolute right-0 top-full z-40`。
- Hooks 左侧栏是 sticky + `lg:overflow-y-auto`, `HealthStatusTip` 的浮层在这个侧栏内部用 `absolute left-0 top-full z-40` 渲染。

截图中的截断表现与代码吻合: 即使浮层自身有 `z-40`, 只要它仍在 header / sticky sidebar / scroll 容器内, 就会受父级 stacking context 和 overflow 裁剪影响。单纯提高局部 `z-index` 不能稳定解决。

## 关联与依赖

项目已有多项 Radix primitive 依赖, 例如 Dialog、Dropdown Menu、Select、Tooltip、Tabs 等。当前没有 `@radix-ui/react-popover`。Radix Popover 官方文档说明它支持 `Portal`、受控 / 非受控打开状态、side/align/collision 参数和 focus 自定义; 官方 release note 也说明 z-index 由应用自行控制。因此它适合作为本任务的浮层定位 primitive。

官方来源:
- Radix Popover: https://www.radix-ui.com/primitives/docs/components/popover
- Radix Tooltip: https://www.radix-ui.com/primitives/docs/components/tooltip
- Radix release note 关于 z-index: https://www.radix-ui.com/primitives/docs/overview/releases

选择 Popover 而不是 Tooltip 的原因:
- Header 指南面板包含可点击的 Details 和外部文档按钮, 属于可交互富内容, 不适合 tooltip 语义。
- Hook 检查当前虽然是说明型 hover 内容, 但用户要求统一 popover 组件, 且内容可能包含多条检查、路径和建议。统一用 Popover 可避免两套定位策略。
- Radix Popover 通过 Portal 离开当前 DOM 裁剪上下文, 再由公共组件统一 `z-index`、`collisionPadding`、动画和触发策略。

既有测试:
- `tests/renderer/capabilities-guidance.test.tsx` 已通过 hover header 指南区域验证指南内容。
- `tests/renderer/hooks-lifecycle-view.test.tsx` 已覆盖 Hook 检查 clean / warning hover 文案。
- 本任务需要在这些测试中补充“浮层通过 Portal 渲染、不被 sidebar/header 包含”的结构断言, 并保证原文案断言不退化。

## 任务分类与 debt 校准

- type / maintenance.subtype: bug / 不适用。
- source.kind / refs: user-request; GH-102。
- debt estimate 修正: 初始估算仍成立, 但影响面明确为 renderer 共享浮层组件 + 两个调用点 + 目标测试。
- scope / risk / areas / confidence: module / medium / ui-ux / medium。
- revision: 暂无。

## 验收标准

1. Header 指南浮层不再被左侧导航栏或 header stacking context 截断。
2. Hooks 生命周期左侧 Hook 检查状态 tag 的 hover/focus 浮层不再被 sticky sidebar 或滚动容器截断。
3. 两处浮层使用同一个共享 renderer 组件, 不再各自手写 absolute 浮层定位。
4. 共享组件基于成熟开源浮层 primitive, 支持 Portal、碰撞避让、hover/focus 触发和键盘可达。
5. 自动化测试覆盖共享组件接入后的 header 指南与 Hook 检查浮层行为。

## 界面质量与交互验收

- 现有页面结构: 桌面工具壳, 左侧固定导航, 内容区上方绝对定位 header, 页面主体独立滚动。Hooks 页面左侧生命周期栏在桌面为 sticky sidebar。
- 设计系统用法: 继续使用 Tailwind token `bg-popover`、`text-popover-foreground`、`border-border`、`shadow-lg`、`rounded-md/rounded-lg`、`focus-visible:ring-ring`。
- 信息密度: 不新增平铺说明块; 浮层仍只在 hover/focus/click 后出现。
- 主要用户路径: 用户在 header hover/click 指南按钮查看当前页面说明; 用户在 Hooks 左侧 hover/focus Hook 检查 tag 查看检查详情。
- 可见状态: trigger 保留 hover/focus 样式; 浮层保留现有宽度和内容密度, 但不被截断。
- 交互反馈: pointer hover、focus 和 click 都能打开; pointer 离开后延迟关闭, 从 trigger 移到内容不闪烁。
- 响应式和可访问性风险: Portal 内容需要 `aria-describedby` 或等价关联, 键盘 focus 不应丢失; `max-width` 与 collision padding 防止贴边。

## 未决问题

暂无。
