# 抛光记录

## 当前任务边界

本任务只新增 Agent Capability Plugin 的 Hook schema 描述能力:

- shared plugin contract 增加 event / handler / field schema。
- Claude Code / Codex 内置 plugin 声明当前官方 Hook 事件与 handler 字段。
- Settings / Hooks renderer 测试保持兼容。

本任务不负责改 Hooks 页面布局、不重排 Hook 行、不迁移 parser / hooks-manager / health engine。

## 检查结果

| 候选项 | 判断 | 处理 |
|---|---|---|
| Hook 行使用 plugin `hookSchema` 选择主展示字段 | 有价值, 但需要改 Hooks UI 数据流和测试 | 不进入当前任务, 作为 parent feature 的后续 UI 切片 |
| Hook 详情展示原始 JSON | 有价值, 已属于前序需求范围 | 不进入当前任务, 作为后续 UI 切片 |
| Settings 插件页展示 hook schema 摘要 | 暂不建议, 会增加默认噪音 | 不做 |
| 本轮视觉截图验收 | 不适用, 当前代码未改 DOM / CSS | renderer 兼容测试作为证据 |

## 结论

当前任务内没有低风险、低成本且必须马上处理的视觉或交互改动。下一步应归档本任务, 再从 parent issue 拆出 Hooks 行级 schema-driven UI 任务。
