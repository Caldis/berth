# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:

GitHub Issue: https://github.com/Caldis/berth/issues/65

Source: UI review during the 1.0 cleanup loop.

Settings > Appearance renders theme and language choices as segmented buttons with visual selected states only. Screen readers do not get a clear mutually-exclusive choice model or selected state.

## 复现步骤

1. Open Settings.
2. Find Appearance -> Theme and Appearance -> Language.
3. Inspect the options with role-based queries or a screen reader.

## 期望 vs 实际

Expected:

- Theme choices are exposed as a radiogroup.
- Language choices are exposed as a radiogroup.
- Each option exposes checked state through ARIA while preserving the current visual design.
- Renderer tests cover the accessible state and selection changes.

Actual:

- Theme and language options are plain buttons.
- Selected state is only visible through styling and the check icon.
