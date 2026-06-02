# BUG 快照 (只读)

来源: GitHub Issue #50

## 复现步骤

1. 将 UI 语言切到中文。
2. 打开 Usage 页面。
3. Hover 每日花费图表。

## 期望 vs 实际

期望: tooltip 的 series label 使用中文费用文案。

实际: `src/renderer/src/pages/usage.tsx` 的 Recharts tooltip formatter 写死返回 `'Cost'`, 中文 UI hover 时会出现英文标签。
