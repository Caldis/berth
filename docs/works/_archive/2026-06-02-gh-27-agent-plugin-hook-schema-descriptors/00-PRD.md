# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:

- Local issue: `docs/issues/2026-06-02-FEATURE-agent-plugin-hook-schema-descriptors.md`
- GitHub issue: https://github.com/Caldis/berth/issues/27

## 正文

# Agent Capability Plugin hook schema descriptors

Continuation of #12 Agent Capability Plugin System.

Goal: let built-in Claude Code and Codex plugins describe hook events, handler types, primary display fields, required fields, runnable support, and write/action constraints so Hooks UI can stop hardcoding agent-specific hook schema knowledge.

Scope:
- Add hook schema descriptors to built-in Claude Code and Codex plugins.
- Cover official Claude Code and Codex hook events and handler types currently surfaced by Berth.
- Keep runtime hook parsing and enable/disable file writes in the existing hooks manager for this slice.
- Add tests proving descriptor metadata and UI-safe i18n keys are stable.

Acceptance:
- Built-in plugins expose hook schema descriptors for Claude Code and Codex.
- Descriptor data can express event lifecycle grouping, handler type fields, required fields, and whether a handler is runnable today.
- Existing Hooks page and Settings plugin UI keep working.
