---
task: 2026-06-04-gh-98-list-virtualization-refresh-performance
task_id: GH-98
type: maintenance
phase: design
created: 2026-06-04
priority: P2
target_date: 
maintenance:
  subtype: performance
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-04-IMPROVEMENT-sessions-list-virtualization.md
    - https://github.com/Caldis/berth/issues/98
debt:
  estimate:
    incurred: 5
    repaid: 12
    net: -7
    scope: global
    risk: high
    areas:
      - performance
      - ui-ux
      - architecture
      - testability
    confidence: medium
    rationale: "0.0-new 初始估算: 跨 Sessions、Memories、Instructions 列表基础设施、第三方依赖、刷新限流和搜索性能; explore/design 后校准。"
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
  number: 98
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/98
  id: I_kwDOSpnDwc8AAAABEUxGww
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgurPJY
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Improve large list virtualization and refresh performance

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
