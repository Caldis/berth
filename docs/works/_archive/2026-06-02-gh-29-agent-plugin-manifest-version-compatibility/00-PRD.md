# PRD 快照 (只读)

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/29
- Parent: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`
- Local issue: `docs/issues/2026-06-02-FEATURE-agent-plugin-manifest-version-compatibility.md`

## 正文

### 背景

The built-in Claude Code and Codex Agent Capability Plugins now describe sources, assets, health checks and hook schemas. The remaining 1.0-facing gap is support for user-provided plugin manifests with explicit schema validation and agent version compatibility.

### 范围

- Define a stable manifest format for non-builtin Agent Capability Plugins.
- Validate plugin schema version, plugin id, target agent compatibility, permissions, sources, assets, health checks and hook schema descriptors before exposing them to UI.
- Represent plugin load status and validation errors in Settings without executing unknown plugin code.
- Keep third-party plugins read-only at this stage unless write/execute permissions are explicitly modeled and confirmed.
- Preserve built-in Claude Code / Codex plugins as registry entries.

### 验收

- A manifest parser/validator exists and is covered by tests.
- Invalid manifests fail closed with actionable error messages.
- Plugin version and target agent compatibility are visible in UI data or state.
- Built-in plugin behavior is unchanged.
