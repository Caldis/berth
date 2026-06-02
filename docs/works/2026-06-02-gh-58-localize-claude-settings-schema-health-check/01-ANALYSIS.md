# 需求分析 (Explore 产物)

## 现状理解

`src/renderer/src/lib/health-check-i18n.ts` 通过 `EXACT_TEXT_KEYS` 将健康检查英文原文映射到 `healthChecks.text.*`。Codex schema health check 已有映射, 但 Claude settings schema health check 缺少对应 key, 因此中文界面 fallback 到原始英文。

## 关联与依赖

本任务只补已知健康检查文案映射和 en/zh 资源, 不修改健康检查生成逻辑、不修改 schema URL、不修改 Overview 布局。

相关测试:

- `tests/renderer/overview-health-checks.test.tsx`
- `tests/renderer/hooks-lifecycle-view.test.tsx`

## 验收标准

1. 中文 Overview 中 Claude settings schema health check 的 title / message / fix label / fix description 均显示中文。
2. 英文界面保持现有英文文案。
3. Unknown health check 文案仍 fallback 原值。
4. 自动化测试覆盖 Overview 与 Hooks hover 中的本地化输出。

## 界面质量与交互验收

仅替换健康检查主文案, 不新增展示块, 不改变信息密度。修复 label 长度应与 Codex schema 检查保持相近。

## 未决问题

无。
