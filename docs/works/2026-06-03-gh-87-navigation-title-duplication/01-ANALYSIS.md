# 需求分析 (Explore 产物)

## 现状理解
- 进程边界: 仅涉及 `src/renderer/src/`, 不涉及主进程、preload 或 IPC 契约。
- Shell 结构: `AppLayout` 固定渲染左侧 `Sidebar`、顶部 `TopNavigation` 与页面内容。
- 导航来源: `nav-config.ts` 定义左侧导航项、分组与路由匹配; `TopNavigation` 按当前路径生成 breadcrumb。
- 重复模式: `TopNavigation` 的最后一级使用当前页面 label, 页面内容区 `h1` 也使用相同或等价 i18n key。

## 关联与依赖
- `/usage`: 顶部栏显示 `Usage`, 内容区 `h1` 显示 `usage.title`。
- `/sessions`: 顶部栏显示 `Sessions`, 内容区 `h1` 显示 `sessions.title`。
- `/instructions/*`: 顶部栏显示 `INSTRUCTIONS > {tab}`, 内容区 `h1` 显示同一个 `{tab}`。
- `/capabilities/*`: 顶部栏显示 `CAPABILITIES > {tab}`, 内容区 `h1` 显示同一个 `{tab}`。
- `/sessions/:id`: 顶部栏显示 `Sessions > Session detail`; 内容区已有返回按钮、局部 breadcrumb 与 session 标题。
- 左侧导航的当前项 label 与页面标题相同是常规导航选中态, 不作为主缺陷处理。

## 任务分类与 debt 校准
- type / maintenance.subtype: `bug`, 不适用 maintenance subtype。
- source.kind / refs: `user-request`, 绑定 GH-87。
- debt estimate 修正: `incurred/net 3 -> 2`, 因 Explore 确认只需改 renderer 顶部导航与测试。
- scope / risk / areas / confidence: `module / low / [ui-ux, testability] / medium`。
- revision: 已写入 `INDEX.md`。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 顶部栏不再显示当前页面标题本身; 页面内容区保留唯一可见 `h1`。
2. `/instructions/*` 与 `/capabilities/*` 顶部栏只显示分组上下文, 内容区显示具体页面标题。
3. `/usage` 与 `/sessions` 顶部栏显示上层分组或保持无当前页重复, 内容区标题不变。
4. `/sessions/:id` 顶部栏不显示 `Session detail` 这类与内容区语义重复的当前页 label。
5. EN/ZH breadcrumb 文案、导航按钮无回退 key; 相关 renderer 测试与 e2e 断言更新。

## 界面质量与交互验收
- 页面结构: 顶部栏是窗口拖拽区与 breadcrumb 容器; 页面标题位于内容区首屏。
- 设计系统: 使用 Tailwind/shadcn 风格 token, 当前 breadcrumb 字号小于 `h1`, 但重复文案削弱层级。
- 信息密度: 左侧导航已提供当前位置, 顶部栏再显示当前页名导致同屏重复。
- 用户路径: 左侧导航切换到 Overview / Sessions / Instructions / Capabilities / Usage 后, 顶部栏与内容区同时出现当前页名。
- 可见状态: 选中态在 Sidebar; TopNavigation 当前页名没有额外操作价值。
- 交互反馈: 本次不改导航点击、focus、hover 或路由跳转。
- 响应式和可访问性: `h1` 应保留; 顶部 `nav[aria-label]` 若无可见 crumb, 不应渲染空 navigation landmark。
- 外部规则参考: Vercel Web Interface Guidelines, Navigation & State / Accessibility / Typography 部分。

## 未决问题
无阻塞问题。
