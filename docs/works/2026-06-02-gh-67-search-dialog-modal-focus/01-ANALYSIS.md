# 需求分析 (Explore 产物)

## 现状理解
- 这是纯 renderer 问题, 不涉及 Electron main / preload / IPC 契约。
- `src/renderer/src/components/layout/app-layout.tsx` 在根布局末尾渲染 `<SearchDialog />`。
- `src/renderer/src/components/layout/sidebar.tsx` 的搜索按钮调用 `useAppStore().setSearchOpen(true)` 打开搜索覆盖层; `Ctrl+K` / `Cmd+K` 也在 `SearchDialog` 的 window keydown handler 中切换 open 状态。
- `src/renderer/src/components/layout/search-dialog.tsx` 当前返回一个 fixed overlay, 包含 backdrop、输入框和 quick action 按钮。输入框有 `autoFocus`, Escape 和 backdrop 能关闭 overlay。
- 当前 dialog 面板没有 `role="dialog"`、`aria-modal="true"` 和 accessible name; backdrop 也没有 `aria-hidden`。
- 当前没有 focus trap。由于 overlay 打开后仍保留背景 DOM 可聚焦元素, 键盘用户可能通过 Tab / Shift+Tab 把焦点移出搜索层。
- `tests/renderer/search-dialog.test.tsx` 只覆盖中文 quick action labels, 没有覆盖 dialog 语义、初始焦点、focus trap、Escape close 和 backdrop close。

## 关联与依赖
- `SearchDialog` 与 `SettingsDialog` 属于同一类 overlay 交互。GH-66 已在 `SettingsDialog` 内实现 `role="dialog"`、`aria-modal`、初始焦点、Tab focus trap 和 Escape close, 可复用同样的本地 helper 思路。
- `SearchDialog` 没有显式 trigger ref。Sidebar click 与 keyboard shortcut 都能打开搜索, 所以关闭后焦点恢复需要谨慎: 本任务先保证 focus 不逃出 overlay; 若要恢复到触发按钮, 需要额外保存打开来源, 不纳入本轮。
- quick action labels 来自 `nav.*` i18n key; 现有视觉层级是小型命令面板, 不需要新增说明文字或视觉重做。
- 使用现有 React / Zustand / Tailwind / Testing Library 即可, 不需要新增依赖。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Search overlay 打开后, 可通过 `getByRole('dialog', { name: ... })` 定位, 并带有 `aria-modal="true"`。
2. 初始焦点进入搜索输入框; 输入框有明确 accessible name 或由 placeholder 可靠查询。
3. Tab 从最后一个 quick action 回到搜索输入框; Shift+Tab 从搜索输入框回到最后一个 quick action。
4. Escape 关闭 overlay; backdrop 点击关闭 overlay。
5. quick action 点击仍会导航并关闭 overlay; 现有中文 label 测试继续通过。
6. 不改变现有布局密度、宽度、圆角、颜色和命令面板视觉层级。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。
- 页面结构: overlay 位于 AppLayout 末尾, z-index 高于 sidebar/main/window controls; 内部是一个居中的命令面板。
- 设计系统: 已使用 Tailwind token `bg-popover`、`border-border`、`text-muted-foreground`、`hover:bg-accent`; 本任务保持这些 token。
- 信息密度: 当前只展示搜索输入、提示和 5 个 quick action, 信息量适合命令面板; 不增加三段式说明或新卡片。
- 用户路径: 用户从 Sidebar 搜索按钮或 `Ctrl+K`/`Cmd+K` 打开, 输入或直接选择 quick action, 也可 Escape/backdrop 关闭。
- 可见状态: 打开、关闭、hover 和 keyboard focus 都应可见; 本任务不改变现有 hover 视觉, 但确保 Tab 顺序符合视觉顺序。
- 响应式: 面板 `max-w-lg w-full` 保持不变; focus trap 不应依赖 viewport。
- 可访问性风险: modal 语义缺失和焦点逃逸是主风险; 修复后需要用 renderer 测试和真实 Electron CDP 断言验证。

## 未决问题
留给 design 向人澄清。
- 无。范围限定为 SearchDialog 的 modal 语义和焦点管理。
