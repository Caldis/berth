---
task: 2026-06-03-gh-79-hooks-health-check-latency
task_id: GH-79
type: bug
phase: implement
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-BUG-hooks-health-check-latency.md
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: cross-process
    risk: medium
    areas:
      - performance
      - architecture
      - testability
    confidence: medium
    rationale: "健康检查慢会跨 renderer 页面状态、IPC 与 main 数据层; 初始估算先按跨进程性能 bug 处理, explore/design 后校准。"
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
  number: 79
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/79
  id: I_kwDOSpnDwc8AAAABEKIV9g
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguh0FY
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Hooks Health Check Latency

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
