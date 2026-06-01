# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

- Local issue: `docs/issues/2026-06-02-FEATURE-agent-plugin-asset-descriptors.md`
- GitHub issue: https://github.com/Caldis/berth/issues/25

## 正文

# Agent Capability Plugin asset descriptors

Continuation of the Agent Capability Plugin System parent issue.

Goal: make built-in Claude Code and Codex plugins describe the asset types they can parse, so the plugin registry can become a reusable capability contract beyond the Settings summary.

Scope:
- Add asset descriptors to built-in Claude Code and Codex plugins.
- Keep descriptors accurate to current scanner/parser output and AssetType values.
- Do not migrate parser execution, health checks, hook schemas, or third-party plugin loading in this issue.
- Add tests proving descriptor coverage does not drift from the current adapter asset output surface.

Acceptance:
- Built-in plugins expose asset descriptors with asset type, category, scopes, and source code linkage where useful.
- Settings can still render plugin data without extra default noise.
- Unit tests cover Claude Code and Codex descriptor lists and key metadata.
