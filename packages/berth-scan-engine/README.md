# @berth/scan-engine

Read-only asset discovery & introspection engine for **Claude Code** and **Codex**.

Scans every relevant on-disk asset (conventions/CLAUDE.md, skills, subagents, commands,
output styles, MCP servers, hooks, plugins + their bundled components, statusline, sessions,
memory) across user / project / project-local / enterprise / plugin scopes, resolves their
relationships, and exposes them through a stable programmatic API and an agent-friendly CLI.

Three consumers:

- **berth UI** (Electron) — imports the engine as a workspace dependency.
- **`berth-scan` CLI** — stable JSON output, deterministic exit codes, read-only. Powers
  the end-to-end test loop and lets agents introspect a machine's agent assets.
- **agents** — invoke the CLI to query/interact with the berth asset model.

> Status: extracted from the berth main process under GH-110. Built incrementally;
> see `docs/works/2026-06-06-gh-110-scan-engine-prod-upgrade/`.

## CLI (preview)

```
berth-scan scan --json
berth-scan assets --type skill --scope user --json
berth-scan inspect <asset-id> --relations --json
berth-scan health --json
```

All commands accept `--home-dir` / `--codex-home` / `--project` for fixture-based testing.
