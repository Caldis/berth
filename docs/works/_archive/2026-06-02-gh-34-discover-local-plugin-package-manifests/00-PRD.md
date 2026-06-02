# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
GitHub Issue #34: https://github.com/Caldis/berth/issues/34

## Problem

Agent Capability Plugin discovery currently reads manifest JSON files from configured manifest paths, the user plugin folder, and project `.berth/agent-plugins`. The PRD also calls for local plugin directories and full plugin package shape, but package directories are not discovered yet.

## Scope

- Keep discovery read-only.
- Support explicit manifest file paths as before.
- Support explicit directory paths and direct child plugin package directories that contain `manifest.json` or `plugin.json`.
- Preserve deterministic ordering and duplicate manifest id handling.
- Add focused unit tests.

## Source

Follow-up from `docs/prd/2026-06-02-agent-capability-plugin-1.0-expansion.md` plugin installation and source section.

## 正文
