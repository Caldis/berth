---
task: 2026-06-04-gh-100-memory-tag-filter-redesign
task_id: GH-100
type: feature
phase: explore
created: 2026-06-04
priority: P2
target_date: 
source:
  kind: github-issue
  refs:
    - https://github.com/Caldis/berth/issues/100
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: low
    rationale: "0.0-new 初始估算; 集中在 renderer 记忆页标签筛选组件 (FilterGroup 折叠态), 取代 GH-97 引入的 hover 浮层交互; explore/design 后校准。"
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
  number: 100
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/100
  id: I_kwDOSpnDwc8AAAABEZAbkA
  state: OPEN
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvMso
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 重新设计记忆页标签筛选组件 (消除冗余与交互问题)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
