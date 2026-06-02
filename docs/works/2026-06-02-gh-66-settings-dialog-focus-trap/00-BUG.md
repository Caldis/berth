# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:

GitHub Issue: https://github.com/Caldis/berth/issues/66

Source: UI/accessibility review during the 1.0 cleanup loop.

SettingsDialog declares `role="dialog"` and `aria-modal="true"`, but it only handles Escape and overlay click. Tab / Shift+Tab are not trapped inside the dialog, so keyboard focus can move behind the modal.

## 复现步骤

1. Open the app.
2. Open Settings from the sidebar.
3. Use Tab or Shift+Tab through the dialog controls.

## 期望 vs 实际

Expected:

- When SettingsDialog is open, Tab cycles from the last focusable item back to the first focusable item in the dialog.
- Shift+Tab cycles from the first focusable item to the last focusable item.
- Escape and existing close behavior continue to work.
- Focus returns to the Settings trigger after closing where possible.
- Renderer tests cover the focus trap and close behavior.

Actual:

- The dialog is labelled as modal, but focus management is incomplete.
- Escape works, but Tab / Shift+Tab are not contained by the modal.
