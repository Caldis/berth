---
task: 2026-06-10-gh-115-architecture-refactor
task_id: GH-115
type: maintenance
phase: explore
created: 2026-06-10
priority: P1
target_date: 
maintenance:
  subtype: architecture
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 2
    repaid: 8
    net: -6
    scope: global
    risk: high
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算: 全局架构重构, 目标偿还 architecture area debt (当前 27); 重构本身有引入回归的 churn 风险, 计 incurred 2。explore/design 后校准。"
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
  number: 115
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/115
  id: I_kwDOSpnDwc8AAAABE9btMw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvQfWo
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 架构全面分析与重构: 分层边界、复用收敛、孤儿代码清理

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
