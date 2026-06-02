# 需求分析 (Explore 产物)

## 现状理解
- 这是纯 renderer 问题, 不涉及 Electron main / preload / IPC 契约。
- `src/renderer/src/components/layout/app-layout.tsx` 在根布局末尾渲染 `<InspectorDrawer />`。
- `src/renderer/src/stores/app.ts` 用 `inspectorOpen`、`inspectorPath`、`inspectorContent`、`openInspector(path, content)` 和 `closeInspector()` 管理抽屉状态。
- `src/renderer/src/pages/instructions.tsx`、`src/renderer/src/pages/capabilities.tsx` 和 `src/renderer/src/components/memory/memory-view.tsx` 会从 `View Raw` / `查看原始文件` 操作打开 InspectorDrawer。
- `src/renderer/src/components/layout/inspector-drawer.tsx` 当前有 backdrop、右侧 drawer、header、Copy button、Close button 和 `<pre>` 内容区。
- 当前 drawer 没有 `role="dialog"`、`aria-modal="true"` 和 accessible name; backdrop 没有 `aria-hidden`。
- 当前没有初始 focus 和 focus trap。打开后焦点可能留在背景触发按钮, Tab / Shift+Tab 可能进入背景页面。
- Copy / Close 是 icon-only button, 当前只设置 `title`, 没有稳定的 `aria-label`; icon 未显式 `aria-hidden`。

## 关联与依赖
- InspectorDrawer 是全局 raw content viewer, 所有打开入口共用同一个组件。修复应集中在 `inspector-drawer.tsx`, 不逐个改页面入口。
- GH-66 和 GH-67 已在 SettingsDialog / SearchDialog 中实现 modal 语义与 focus trap, 本任务可沿用同样的本地 helper 思路。
- i18n 已有 `inspector.copy`、`common.close`、`common.viewRaw`, 可以作为 Copy / Close / dialog accessible name, 不需要新增文案。
- 抽屉不是页面路由, 只展示已有 `path` 和 `content`; 不改 store shape 和数据加载。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. InspectorDrawer 打开后, 可通过 `getByRole('dialog', { name: ... })` 定位, 并带有 `aria-modal="true"`。
2. 初始焦点进入抽屉内的 Close button 或第一个可操作按钮。
3. Copy / Close 按钮都有明确 accessible name, icon 不污染按钮名称。
4. Tab 从最后一个可聚焦元素回到第一个可聚焦元素; Shift+Tab 从第一个可聚焦元素回到最后一个可聚焦元素。
5. Escape 和 backdrop 点击都能关闭抽屉。
6. Copy button 继续把内容写入剪贴板, 并保持 copied 状态反馈。
7. 抽屉宽度、右侧滑入层级、header/path/pre 内容布局不改变。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。
- 页面结构: backdrop 在 z-40, drawer 在 z-50, 固定右侧, 最大宽度 `max-w-2xl`, 内容区滚动。
- 设计系统: 已使用 `bg-background`、`border-border`、`bg-muted/50`、`text-muted-foreground` 和 lucide icons; 本任务不改变视觉 token。
- 信息密度: header 展示短路径和完整路径, 内容区展示 raw text。无需新增说明块。
- 用户路径: 用户从资产卡片或 memory note 点击 View Raw 打开, 可复制内容、关闭抽屉或按 Escape 离开。
- 可见状态: Close/Copy hover 保持原样; focus 状态当前不够明确, 但本任务主要修焦点边界和语义, 不做视觉重设计。
- 响应式: Drawer 保持 `w-full max-w-2xl`, 小屏时占满宽度; focus trap 不依赖 viewport。
- 可访问性风险: 缺 modal 语义、初始焦点和 focus trap 是主风险; icon-only button 名称不稳定是次风险。

## 未决问题
留给 design 向人澄清。
- 无。范围限定为 InspectorDrawer 的 modal 语义、焦点管理和 icon button accessible name。
