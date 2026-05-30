---
task: 2026-05-30-windows-command-capability-usage-empty
type: bug
jira:
phase: archive
created: 2026-05-30
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
gh_project:
  owner: Caldis
  project: berth
  project_number: 6
  item_id: PVTI_lAHOADXbEs4BZHvQzguPa2c
  item_url:
---

# Windows command/capability/usage data empty

任务索引与交接锚。phase 字段为唯一状态源, `opsx-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
已由 PRD / user manual 消解:
- Session 保持 PRD 顶层 JSONL 语义, 不把 `subagents/*.jsonl` 当独立 session。
- Usage 数据源包含 `stats-cache.json`; 没有真实成本时不估算成本。
- Capabilities 默认 MCP tab 保持 PRD 线框约定, 通过 tab counts 表明 hooks/plugins 等其他能力有数据。
