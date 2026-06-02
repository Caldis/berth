---
task: 2026-06-02-gh-76-harness-task-type-debt-workflow
task_id: GH-76
type: feature
phase: verify
created: 2026-06-02
priority: P1
target_date: 2026-06-03
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/76
debt:
  estimate:
    incurred: 13
    repaid: 0
    net: 13
    scope: global
    risk: high
    areas:
      - tooling-ci
      - architecture
      - testability
    confidence: medium
    rationale: "修改 harness 状态契约、校验、统计和 GitHub Project 同步脚本。"
  final:
    incurred: 18
    repaid: 10
    net: 8
    scope: global
    risk: high
    areas:
      - tooling-ci
      - architecture
      - testability
    confidence: high
    rationale: "实现触及 harness schema、stats、GitHub Project 同步和 workflow 文档; 同时消除了任务分类、debt 统计和 Project 字段同步缺口。"
  revisions:
    - at: verify
      date: 2026-06-02
      from:
        incurred: 13
        repaid: 0
        net: 13
        confidence: medium
      to:
        incurred: 18
        repaid: 10
        net: 8
        confidence: high
      reason: "实现后确认影响面为 global; 自动化同步和规则文档偿还了部分 harness 流程 debt。"
issue:
  number: 76
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/76
  id: I_kwDOSpnDwc8AAAABEIubMg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgugmVc
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Harness task type and debt workflow

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
