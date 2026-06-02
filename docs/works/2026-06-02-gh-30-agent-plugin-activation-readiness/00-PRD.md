# PRD 快照 (只读)

来源:

- GitHub Issue: https://github.com/Caldis/berth/issues/30
- PRD: `docs/prd/2026-06-02-agent-capability-plugin-1.0-expansion.md`

## 正文

### Scope

Add an activation readiness model for third-party Agent Capability Plugin manifests.

This is the next safe slice after manifest validation:

- Keep third-party plugin code non-executable.
- Classify valid manifests as metadata-only or activation-ready based on declared implementation metadata.
- Surface blocked states for write / execute permissions and incompatible agent versions.
- Show the readiness state in Settings without making the plugin active.
- Preserve built-in Claude Code / Codex behavior.

### Acceptance

- Manifest status includes a user-visible activation readiness reason.
- Settings distinguishes built-in plugins, metadata-only manifests, activation-ready manifests, invalid manifests and incompatible manifests.
- Write / execute permissions remain blocked unless a future explicit approval model exists.
- Tests cover registry data and Settings UI states.
