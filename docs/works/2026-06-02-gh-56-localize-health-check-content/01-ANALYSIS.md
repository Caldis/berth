# 需求分析 (Explore 产物)

## 现状理解

- `src/main/engine/health.ts` 在主进程扫描健康检查, 返回 `HealthCheck.title/message/suggestion/fix/evidence` 等成品字符串。
- `src/renderer/src/pages/overview.tsx` 和 `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 直接显示这些字符串。
- 当前 renderer 已用 i18n 翻译页面标题、计数、按钮 title, 但没有翻译健康检查内容本身。
- 主进程不知道 renderer 当前语言, 不适合在 `runHealthChecks()` 内按语言翻译。

## 关联与依赖

- IPC 契约 `src/shared/types/ipc.ts` 当前只要求健康检查带英文 fallback 字段; 不需要为本任务改契约。
- Overview 与 Hooks 生命周期侧栏都会显示健康检查内容, 修复应复用同一个 renderer helper, 避免一个页面修好另一个页面继续漏英文。
- 健康检查内容里有动态文本, 例如 `{{name}} has no SKILL.md entrypoint.`。已知文本可翻译, 未知文本保留原文作为 fallback。

## 验收标准

1. 中文 Overview 健康检查标题、说明、fix label、fix description 和 evidence label 不再显示本次已验证的英文样例。
2. Hooks 生命周期侧栏 hover 详情使用同一套健康检查文本翻译。
3. 英文界面仍显示原有英文文案, 不改变主进程健康检查扫描结果。
4. 未知健康检查文本保持原文, 不阻断显示。

## 界面质量与交互验收

- 本任务只改文案显示, 不改布局、间距、颜色、hover 行为和点击行为。
- 中文文本可能更长, 需要保持现有换行与 `break-all` / `truncate` 行为不退化。
- 视觉验收至少确认 Overview 中文页面中健康检查标题和建议文案为中文。

## 未决问题

无。
