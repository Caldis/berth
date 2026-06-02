# 需求分析 (Explore 产物)

## 现状理解
- 相关组件位于 `src/renderer/src/components/layout/settings-dialog.tsx` 和 `src/renderer/src/components/layout/sidebar.tsx`, 属于 renderer 层, 不涉及 Electron main / preload / IPC 契约。
- SettingsDialog 当前在打开时渲染 `role="dialog"`、`aria-modal="true"` 和 `aria-labelledby="settings-dialog-title"`。
- 弹窗已有 Escape 关闭、遮罩点击关闭、关闭按钮 autoFocus。
- 弹窗没有处理 Tab / Shift+Tab, 因此键盘焦点可以离开 modal, 与 `aria-modal="true"` 表达的交互模型不一致。
- 侧边栏中的 Settings 按钮负责打开弹窗, 但关闭后没有显式恢复焦点到触发器。
- W3C APG Modal Dialog Pattern 明确要求 Tab / Shift+Tab 不把焦点移出 dialog。MDN `aria-modal` 文档也说明 ARIA 属性本身不会实现焦点管理, 需要 JavaScript 处理。

## 关联与依赖
- `Sidebar` 通过本地 `settingsOpen` state 控制 `SettingsDialog`。
- `SettingsDialog` 接收 `open` 和 `onOpenChange`, 当前没有 ref 或 trigger 参数。
- Settings 内容来自 `SettingsContent`, 其中含按钮、radio、switch、可折叠插件项等多个可聚焦元素, focus trap 不能写死元素顺序。
- 现有测试未覆盖 SettingsDialog。可新增 renderer test 直接渲染 wrapper 组件, 打开弹窗后验证 focus trap、Escape、关闭后焦点恢复。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. SettingsDialog 打开后, 初始焦点仍在弹窗内的关闭按钮。
2. 按 Tab 到最后一个可聚焦元素时, 下一次 Tab 回到弹窗内第一个可聚焦元素。
3. 在第一个可聚焦元素上按 Shift+Tab 时, 焦点回到弹窗内最后一个可聚焦元素。
4. Escape 和关闭按钮继续关闭弹窗。
5. 从侧边栏触发打开的 SettingsDialog 关闭后, 焦点尽量返回 Settings 触发按钮。
6. focus trap 不依赖 SettingsContent 的固定结构; 新增可聚焦元素后仍按 DOM 查询生效。
7. 视觉布局、文案和设置项不变。

## 界面质量与交互验收
前端或 UI 相关任务填写。记录现有页面结构、设计系统用法、信息密度、主要用户路径、可见状态、交互反馈、响应式和可访问性风险; 非 UI 任务写“不适用”。

- 页面结构: SettingsDialog 是居中 modal, header 内标题 + 关闭按钮, body 可滚动。
- 设计系统: 使用现有 Tailwind token 和 lucide `X` 图标, 本任务不改视觉样式。
- 信息密度: 不新增说明文案, 只修键盘行为。
- 主要路径: 用户从侧边栏打开设置, 修改选项, 关闭后继续在侧边栏或页面工作。
- 可见状态: focus 样式沿用现有按钮/控件样式; 本任务不引入新的视觉状态。
- 交互反馈: Escape、关闭按钮、遮罩点击保留; Tab/Shift+Tab 在 modal 内循环。
- 响应式: 不改变布局和尺寸。
- 可访问性风险: `aria-modal="true"` 但焦点可离开 dialog 会误导辅助技术用户; 需要同时处理 Tab 循环和关闭后焦点恢复。

## 未决问题
留给 design 向人澄清。

- 无。范围可从组件现状和 modal dialog 标准直接确定。

## 参考

- W3C APG Dialog Modal Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- MDN aria-modal: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-modal
