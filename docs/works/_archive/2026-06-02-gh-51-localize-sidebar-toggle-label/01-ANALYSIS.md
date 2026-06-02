# 需求分析 (Explore 产物)

## 现状理解

Sidebar 内大多数可见文案已经走 i18n, 包括导航、Agent 视角和 Settings 按钮。底部折叠按钮是 icon-only, 因此文案只存在于 `aria-label`。当前该 label 写死为英文:

`aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}`

这会让中文 UI 的辅助技术读出英文。

## 关联与依赖

- 组件: `src/renderer/src/components/layout/sidebar.tsx`
- locale: `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`
- 测试: `tests/renderer/sidebar-agent-view.test.tsx`

## 验收标准

1. Sidebar 折叠 / 展开按钮的 `aria-label` 使用 locale key。
2. 中文 renderer 测试覆盖折叠前后的两个 accessible label。
3. 目标测试、本地检查和 GitHub Actions 通过。

## 界面质量与交互验收

本任务不改变视觉布局。按钮仍为 icon-only, 但 accessible name 与当前语言一致。

## 未决问题

无。
