---
task: 2026-06-03-gh-80-session-detail-activity-metrics
task_id: GH-80
type: bug
phase: explore
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-BUG-session-detail-activity-metrics.md
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - architecture
      - testability
    confidence: low
    rationale: "会话详情页指标涉及原始会话解析、token rate 定义和 skills/MCP/hooks 识别; 初始按模块级解析 bug 估算, explore/design 后校准。"
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
  number: 80
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/80
  id: I_kwDOSpnDwc8AAAABEKZomw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiCCY
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Session Detail Activity Metrics

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
