# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

- Local issue: `docs/issues/2026-06-02-FEATURE-agent-plugin-health-check-descriptors.md`
- GitHub issue: https://github.com/Caldis/berth/issues/26

## 正文

# Agent Capability Plugin health check descriptors

Continuation of the Agent Capability Plugin System parent issue.

Goal: let built-in Claude Code and Codex plugins describe the health check rules they support, while keeping runtime file reads and validation execution in the existing health check engine.

Scope:
- Add health check descriptors to built-in Claude Code and Codex plugins.
- Descriptors should capture rule id, severity, category, agent, optional asset type/scope/source code, and i18n keys.
- Keep runtime health check execution in src/main/engine/health.ts.
- Do not redesign the Overview health UI in this issue, but keep Settings plugin data renderable.

Acceptance:
- Built-in plugins expose health check descriptors for current Claude Code / Codex health rule families.
- Tests prove descriptor ids and key metadata do not drift from the current health check categories.
- Existing health checks and Settings plugin UI keep working.
