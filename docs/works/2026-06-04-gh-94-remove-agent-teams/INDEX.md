---
task: 2026-06-04-gh-94-remove-agent-teams
task_id: GH-94
type: bug
phase: explore
created: 2026-06-04
priority: P2
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md
debt:
  estimate:
    incurred: 4
    repaid: 1
    net: 3
    scope: global
    risk: medium
    areas:
      - architecture
      - ui-ux
      - testability
    confidence: medium
    rationale: "0.0-new 初始估算; 需要移除跨扫描器、共享类型、导航、搜索、说明和测试中的 Agent Teams 静态资产入口。"
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
  number: 94
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/94
  id: I_kwDOSpnDwc8AAAABERWaEA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguoT8A
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Remove Agent Teams Static Asset Surface

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始缺陷描述快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
