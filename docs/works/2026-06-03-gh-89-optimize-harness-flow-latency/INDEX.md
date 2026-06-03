---
task: 2026-06-03-gh-89-optimize-harness-flow-latency
task_id: GH-89
type: maintenance
phase: design
created: 2026-06-03
priority: P2
target_date: 
maintenance:
  subtype: tooling-ci
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 2
    repaid: 7
    net: -5
    scope: global
    risk: medium
    areas:
      - tooling-ci
      - testability
    confidence: medium
    rationale: "用户要求降低 harness 主流程阻塞时间: 异步化 Project/CI 等非本地任务, 分析 prepush 与 Vitest 耗时。"
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
  number: 89
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/89
  id: I_kwDOSpnDwc8AAAABENh_AA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguko20
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Optimize Harness Flow Latency

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
