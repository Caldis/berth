# 需求分析 (Explore 产物)

## 现状理解

`src/renderer/src/lib/health-check-i18n.ts` 已经把已知健康检查的 title / message / suggestion / fix / evidence 文案映射到 `healthChecks.text.*`。

Overview 的健康检查列表在 `src/renderer/src/pages/overview.tsx` 中渲染。列表先计算 `displayCheck = localizeHealthCheck(check, t)`, 但 scope / confidence / asset type 仍直接使用原始字段:

- `check.scope`
- `check.confidence`
- `check.assetType`

Hooks 生命周期侧边菜单的健康检查 hover 行在 `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 中渲染。`HookHealthCheckTipRow` 同样只用 `localizeHealthCheck()` 处理主文案, scope 仍直接显示 `check.scope`。

## 关联与依赖

已有 `common.scope.*` 文案可复用, 不需要新增另一套 scope 文案。confidence 与 asset type 当前没有健康检查专用标签, 需要补 `healthChecks.text.confidence.*` 和 `healthChecks.text.assetTypes.*`。未知枚举值应保留原值, 避免把新 provider 或新检查项的信息吞掉。

测试已有两个入口:

- `tests/renderer/overview-health-checks.test.tsx`
- `tests/renderer/hooks-lifecycle-view.test.tsx`

这次只替换标签文案, 不改变健康检查分组、忽略按钮、路径、修复片段、跳转和 hover 展示逻辑。

## 验收标准

1. 中文界面 Overview 健康检查卡片不再展示 raw scope / confidence / asset type。
2. 中文界面 Hooks 生命周期侧边菜单的 Hook 检查 hover 卡片不再展示 raw scope。
3. 英文界面仍保持可读英文标签, 未知值保留原值, 避免吞信息。
4. 自动化测试覆盖 Overview 与 Hooks 生命周期两个入口。

## 界面质量与交互验收

页面结构不变, 仅替换 tag 文案。tag 宽度变化不能破坏卡片布局、hover 卡片和列表密度。原始 JSON / source 入口仍保留原始配置可查。

## 未决问题

无。
