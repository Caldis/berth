# BUG 快照 (只读)

来源: GitHub Issue #51

## 复现步骤

1. 将 UI 语言切到中文。
2. 打开主界面侧边栏。
3. 检查侧边栏底部折叠 / 展开按钮的 accessible name。

## 期望 vs 实际

期望: icon-only 折叠按钮使用中文 accessible label。

实际: `src/renderer/src/components/layout/sidebar.tsx` 写死 `Expand sidebar` / `Collapse sidebar`。
