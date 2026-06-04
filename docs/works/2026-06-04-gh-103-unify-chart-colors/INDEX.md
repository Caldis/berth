---
task: 2026-06-04-gh-103-unify-chart-colors
task_id: GH-103
type: maintenance
phase: explore
created: 2026-06-04
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs:
    - GH-103
debt:
  estimate:
    incurred: 2
    repaid: 2
    net: 0
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: low
    rationale: "0.0-new 初估; 统一 4 处图表配色到单一主题色板, 重点替换首页近7天费用柱状图丑配色, 消除分散硬编码 (repay), 引入主题 token (incurred)。explore/design 后校准。"
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
  number: 103
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/103
  id: I_kwDOSpnDwc8AAAABEZFURA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguvQyk
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一应用内图表配色主题

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
