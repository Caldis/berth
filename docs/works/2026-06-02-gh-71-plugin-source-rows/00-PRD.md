# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
https://github.com/Caldis/berth/issues/71

## 正文
Settings > Agent Capability Plugins currently shows source totals such as `2 sources` and `1 scanned · 1 missing · 0 not scanned`, but the expanded Sources detail does not list the actual source paths, scopes, kinds, categories, or declared descriptor state.

This makes the source summary hard to act on. It repeats the earlier UI problem where numeric tags are visible but users cannot tell what they refer to.

Expected:

- When a built-in Agent Capability Plugin is expanded, the Sources detail should show concrete source rows for each known source.
- Each row should show status, scope, kind, categories, path or path pattern, and whether the source came from a declared plugin descriptor.
- The list should stay compact and should not add default detail noise when the plugin row is collapsed.

Verification:

- Renderer test covers expanded plugin source rows.
- Typecheck and harness checks pass.
