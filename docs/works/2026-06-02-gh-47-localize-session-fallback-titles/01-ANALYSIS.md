# 需求分析 (Explore 产物)

## 现状理解

`SessionSummary.title` 为空时, renderer 有三处直接拼接英文 fallback:

- `src/renderer/src/pages/overview.tsx`: 总览最近会话列表。
- `src/renderer/src/pages/sessions.tsx`: Sessions 列表。
- `src/renderer/src/pages/session-detail.tsx`: 详情页 breadcrumb 和主标题。

这三处都已经在组件内使用 `useTranslation()`, 可以直接复用现有 i18n 结构。当前 `src/renderer/src/i18n/locales/en.json` 与 `zh.json` 的 `sessions` 段没有无标题 fallback key。

## 关联与依赖

无 IPC 或数据结构变更。`SessionSummary.id` 与 URL 参数 `id` 已经存在, 只需要保留当前 `slice(0, 8)` 的短 id 规则。

测试集中在 `tests/renderer/sessions-pages.test.tsx`, 已经覆盖总览、列表、详情页三条路径。新增测试可直接构造 `title: ''` 的 session, 切换 i18n 到 `zh`, 验证中文 fallback。

## 验收标准

1. 中文界面中, 无标题 session 在总览最近会话、Sessions 列表、详情页 breadcrumb/title 显示 `会话 #<短 id>`。
2. 英文界面仍显示 `Session #<短 id>`。
3. 有标题 session 仍优先显示原始标题, 不被 fallback 覆盖。
4. 不改变列表布局、分组、点击路径、token/费用等其他展示。

## 界面质量与交互验收

这是文案/i18n 修复, 不新增可视结构。验收关注:

- fallback 文案短, 不占用额外副标题空间。
- 长短 id 与现有布局一致, 仍可被 `truncate` 处理。
- 中文界面不漏英文硬编码。
- 链接、按钮、键盘可达性不变。

## 未决问题

无。
