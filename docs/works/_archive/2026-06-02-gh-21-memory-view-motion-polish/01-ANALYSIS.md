# 需求分析 (Explore 产物)

## 现状理解

目标页面是 `MemoryView`, 主要代码在 `src/renderer/src/components/memory/memory-view.tsx`, 测试在 `tests/renderer/memory-view.test.tsx`。

当前交互问题集中在两个局部:
- `NoteCard` 的详情区域只在 `expanded` 为 true 时挂载, 没有展开/收起过渡。
- 点击关联笔记后, `focusId` 会设置到目标卡片, 但没有自动清理, 视觉上像一个永久状态。

这些都是纯前端状态和样式问题, 不改变 memory 数据契约、IPC 或主进程读取逻辑。

## 关联与依赖

- `MemoryView` 已有单测覆盖缺失文件、原文展示和交互路径, 适合直接补 renderer test。
- 视觉约束来自当前用户要求: 应优先改善 UI/UX, 走简洁的黑白/中性色方向, 不引入大面积装饰。
- 动效约束: 展开/折叠使用 `grid-template-rows`, 高亮使用短暂反馈, 并尊重 `prefers-reduced-motion`。

## 验收标准

1. 展开详情区时, DOM 保持可测试, 详情区使用 grid rows 过渡表达展开/收起。
2. 收起时详情区不应继续被普通读屏/键盘路径访问。
3. 点击关联笔记后, 目标卡片短暂高亮, 约 2 秒后自动清除。
4. 高亮自动清除不能泄露 timer, 组件卸载时清理 pending timer。
5. 不改变 memory 数据源、IPC、缺失文件提示等既有行为。

## 界面质量与交互验收

- 页面结构: MemoryView 是工作型列表界面, 动效应服务状态变化, 不增加额外说明文字。
- 信息密度: 保持当前列表密度, 详情内容只在用户展开后出现。
- 主要用户路径: 展开笔记、查看 raw/metadata/links、点击关联跳转。
- 可见状态: expanded、focused、missing、raw open 状态需同时可辨认。
- 交互反馈: 关联跳转是一次性反馈, 高亮不应长期抢占注意力。
- 响应式: 过渡不能依赖固定高度; 长内容仍由现有容器处理。
- 可访问性: 收起区域隐藏时设置 `aria-hidden`, 并避免保留可聚焦元素。

## 未决问题

无。
