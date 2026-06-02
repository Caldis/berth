# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: GitHub Issue #74 — https://github.com/Caldis/berth/issues/74

## 复现步骤
1. 启动 Electron dev 实例。
2. 打开 Overview 页面, 让 health checks 渲染包含 info 检查和带 fix snippet 的检查。
3. 用 CDP 或 Testing Library 检查 `button` 控件的可访问名称。

## 期望 vs 实际
- 期望: “忽略信息检查”和“复制修复片段”图标按钮保留紧凑视觉样式, 同时暴露本地化可访问名称。
- 实际: 这些按钮只有 `title`, 没有 `aria-label`; 属性级审计看到按钮 text 和 `aria-label` 为空, Testing Library 进一步确认 `title` 会作为兜底名称, 但实现仍依赖隐式兜底。

## 原始摘要
Overview health check action buttons for ignoring info checks and copying fix snippets render as icon-only buttons with title attributes, but no explicit aria-label.
