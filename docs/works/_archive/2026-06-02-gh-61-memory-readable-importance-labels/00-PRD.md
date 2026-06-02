# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
GitHub Issue #61: https://github.com/Caldis/berth/issues/61

## 正文
Memory 页当前在 note badge 和 importance filter chip 中直接展示 `core`、`active`、`archive` 等枚举值。

目标:
- 使用可读、可本地化的 importance label。
- 保留现有 hover 说明，用户仍能理解每类记忆的加载语义。
- 不改变筛选逻辑和记忆数据结构。
