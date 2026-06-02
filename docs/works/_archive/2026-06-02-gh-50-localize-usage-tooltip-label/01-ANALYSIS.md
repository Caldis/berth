# 需求分析 (Explore 产物)

## 现状理解

Usage 页面已使用 `useTranslation()` 和 `t()` 渲染标题、分组、成本模式、空状态和说明文案。每日花费图表的 `Tooltip` formatter 例外, 当前写死:

`formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}`

locale 文件中没有 Usage 专用的短成本名, 只有 `usage.dailyCost`、`usage.actualCostShort` 等上下文更具体的文案。tooltip series label 需要一个 `usage.cost` 短 key: 英文 `Cost`, 中文 `费用`。

## 关联与依赖

- 页面: `src/renderer/src/pages/usage.tsx`
- 测试: `tests/renderer/sessions-pages.test.tsx` 已覆盖 Usage 页面数据展示, 可增加中文渲染断言。
- Recharts 在测试环境里有 mock, 需要先确认是否能直接观察 tooltip formatter 的输出。若不能, 则通过源码行为加目标测试组合验证。

## 验收标准

1. Usage 每日花费图表 tooltip formatter 使用 `t('usage.cost')`, 不再硬编码 `Cost`。
2. 中文 Usage renderer 测试覆盖页面能用中文成本标签渲染, 并避免目标代码再次出现硬编码 tooltip label。
3. 目标测试、全量测试、harness 检查和 GitHub Actions 通过。

## 界面质量与交互验收

本任务只修正文案来源, 不改变布局、颜色、交互结构。图表 tooltip 仍显示金额和 series 名称。

## 未决问题

无。
