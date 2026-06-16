---
task: 2026-06-17-gh-137-windows-incremental-watch-full-rescan
task_id: GH-137
type: bug
phase: explore
created: 2026-06-17
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-16-BUG-windows-incremental-watch-full-rescan.md
debt:
  estimate:
    incurred: 2
    repaid: 0
    net: 2
    scope: module
    risk: medium
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算; windows 路径归一 (derive-asset.ts \\\\ vs /) 根因待 explore 实机定位后校准。slip 因 derive 路径缺平台无关单测 (testability gap)。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions: []
issue:
  number: 137
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/137
  id: I_kwDOSpnDwc8AAAABFrR5Yw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgv7lg8
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# GH-137 Windows skill 文件变更走全量重扫而非增量折叠

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
