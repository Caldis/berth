---
task: 2026-06-03-gh-81-global-search-usability
task_id: GH-81
type: bug
phase: explore
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-BUG-global-search-usability.md
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: cross-process
    risk: high
    areas:
      - architecture
      - testability
      - ui-ux
    confidence: low
    rationale: "0.0-new 初始估算; 全局搜索涉及 renderer 入口、搜索索引、IPC 查询、结果路由和键盘交互, explore/design 后校准。"
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
  number: 81
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/81
  id: I_kwDOSpnDwc8AAAABEKnnzw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiNLQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Global Search Usability

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
