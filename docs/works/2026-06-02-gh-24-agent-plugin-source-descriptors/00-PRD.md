# PRD 快照 (只读)

来源:

- Local issue: `docs/issues/2026-06-02-FEATURE-agent-plugin-source-descriptors.md`
- GitHub issue: https://github.com/Caldis/berth/issues/24

## 正文

# Agent Capability Plugin source descriptors

Continuation of #12.

Goal: make Agent Capability Plugin source discovery data usable beyond the Settings read-only panel.

Scope:
- Add source descriptors to built-in Claude Code and Codex plugins.
- Keep descriptors accurate to existing adapters and ScanSourceCode values.
- Do not migrate health checks, hook actions, or third-party plugin loading in this issue.
- Add tests proving plugin source descriptors match scanner source coverage categories and status handling.

Acceptance:
- Built-in plugins expose source descriptors with scope, kind, categories, and scan source codes.
- Existing source coverage can be derived by joining scanner groups with plugin descriptors.
- Settings continues to render source coverage from the plugin list.
