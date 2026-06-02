# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
https://github.com/Caldis/berth/issues/68

## 复现步骤
1. 在任意资产卡片中点击 `查看原始文件` / `View Raw`, 打开 InspectorDrawer。
2. 使用 Tab / Shift+Tab 在页面上移动焦点。
3. 使用 Escape 或点击 backdrop 关闭抽屉。

## 期望 vs 实际
期望:
- InspectorDrawer 作为 modal side drawer 暴露给辅助技术, 有明确可访问名称。
- 初始焦点进入抽屉内的操作按钮。
- Tab / Shift+Tab 保持在抽屉内部。
- Escape 和 backdrop 点击可关闭抽屉。
- Copy / Close 这类 icon-only button 有明确 accessible name。

实际:
- Drawer 视觉上是 modal overlay, 但没有 `role="dialog"` / `aria-modal` 语义。
- 没有 focus trap, 键盘用户可能把焦点移动到背景页面。
- Icon-only button 只设置了 `title`, 语义不够稳定。
