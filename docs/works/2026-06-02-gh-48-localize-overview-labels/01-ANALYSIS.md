# 需求分析 (Explore 产物)

## 现状理解

`Overview` 已经使用 `useTranslation()`, 但 `statCards` 中有两项直接写英文:

- `Skills`
- `Plugins`

健康检查分组头部也直接拼英文 severity:

- `{group.errors} error`
- `{group.warnings} warning`
- `{group.info} info`

这些文案在中文 UI 中可见, 且不属于 Agent 原始数据。

## 关联与依赖

不涉及 IPC、扫描器或健康检查引擎。`tests/renderer/overview-health-checks.test.tsx` 已覆盖健康检查分组计数, 可扩展中文用例。

## 验收标准

1. 中文界面 Overview 统计卡片显示 `Skills` 以外的当前产品约定文案, `Plugins` 显示为 `插件`。
2. 中文界面健康检查分组计数显示 `1 个错误`、`1 个警告`、`1 条信息`。
3. 英文界面保持 `Skills`、`Plugins`、`1 error`、`1 warning`、`1 info`。
4. 不改变健康检查列表展开、忽略 info、打开路径、复制修复片段等行为。

## 界面质量与交互验收

短标签替换不改变布局。健康检查计数仍保持小号辅助信息, 中文长度不应挤占主标题。

## 未决问题

无。
