# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/33
- Follow-up PRD: `docs/prd/2026-06-02-agent-capability-plugin-1.0-expansion.md`

## 正文

Agent Capability Plugin manifests can declare read, write, and execute permissions, but Settings currently only shows blocked permission kinds for third-party manifests. Users cannot review declared scopes, path patterns, or reasons before deciding whether a plugin is safe.

Scope:

- Keep third-party manifests read-only and inactive.
- Preserve fail-closed behavior for write and execute permissions.
- Surface validated permission details in Settings so review is possible.
- Add focused tests for manifest parsing and Settings rendering.

PRD permission review requirements:

- `read`: default visible, user can disable later.
- `write`: must show target paths, write reason, backup strategy, and conflict strategy.
- `execute`: must be disabled by default and require user confirmation before activation.
