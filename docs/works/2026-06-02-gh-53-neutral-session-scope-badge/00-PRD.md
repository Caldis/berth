# PRD 快照 (只读)

来源: https://github.com/Caldis/berth/issues/53

## 正文

neutral theme 更新后, 非语义橙色只剩 `session` scope badge:

- `src/renderer/src/components/shared/scope-badge.tsx`
- `src/renderer/src/pages/instructions.tsx` 中重复定义的本地 `ScopeBadge`

问题:

- `session` 是资产作用域, 不是 warning 状态。
- 保留橙色会让 UI 仍残留旧主题色。
- Instructions 页重复定义 scope badge 颜色, 后续容易再次漂移。

范围:

- 将 `session` scope badge 改成中性色。
- Instructions 页复用 shared `ScopeBadge`。
- 增加小型回归测试, 防止非 warning 的 session scope badge 再出现 orange class。
