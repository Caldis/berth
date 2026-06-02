# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
https://github.com/Caldis/berth/issues/67

## 复现步骤
1. 打开应用任意页面。
2. 使用 `Ctrl+K` / `Cmd+K` 打开 Search overlay。
3. 使用 Tab / Shift+Tab 在页面上移动焦点。

## 期望 vs 实际
期望:
- Search overlay 作为 modal dialog 暴露给辅助技术, 有可访问名称。
- 初始焦点进入搜索输入框。
- Tab / Shift+Tab 保持在 overlay 内部。
- Escape 和 backdrop 点击可关闭 overlay。

实际:
- Search overlay 视觉上是 modal, 但没有 `role="dialog"` / `aria-modal` 语义。
- 没有 focus trap, 键盘用户可能把焦点移动到背景页面。
