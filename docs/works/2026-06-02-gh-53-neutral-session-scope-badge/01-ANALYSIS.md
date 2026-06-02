# 需求分析 (Explore 产物)

## 现状理解

`rg` 显示剩余 orange class 只用于 `session` scope badge:

- shared `ScopeBadge` 的 `session` 色值。
- Instructions 页本地重复 `ScopeBadge` 的 `session` 色值。

其他 amber/yellow 使用点用于 warning、conflict、pending、cache 等语义状态, 不属于本任务。

## 关联与依赖

- `src/renderer/src/components/shared/scope-badge.tsx`: 多页面复用的 scope badge。
- `src/renderer/src/pages/instructions.tsx`: 当前有本地同名组件, 可改为复用 shared 组件。
- `tests/renderer`: 可加轻量测试覆盖 class 和 Instructions 源码不再有 orange scope 色。

## 验收标准

1. `session` scope badge 使用中性颜色, 不再出现 `orange` class。
2. Instructions 页不再维护本地重复 scope badge 颜色映射。
3. warning / amber / yellow 语义状态色不改。
4. 目标测试和本地检查通过。

## 界面质量与交互验收

- 这是 badge 色彩和组件复用改动, 不改变布局层级和主要用户路径。
- 中性 `session` badge 应和黑白主题一致, 且仍能与 user/project/enterprise 区分。
- Instructions 页 badge 形状保留当前 `rounded-full`、`font-semibold` 的显示方式。

## 未决问题

无。
