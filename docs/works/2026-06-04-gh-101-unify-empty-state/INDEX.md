---
task: 2026-06-04-gh-101-unify-empty-state
task_id: GH-101
type: bug
phase: explore
created: 2026-06-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - GH-101
debt:
  estimate:
    incurred: 2
    repaid: 1
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: medium
    rationale: "0.0-new 初估; 空态一致性收敛, 改 1 个共享组件 + 移除 capabilities 本地同名 EmptyState + 校准各页面容器高度链。explore/design 后校准。"
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
  number: 101
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/101
  id: I_kwDOSpnDwc8AAAABEZBazg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvNok
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一全站空态样式: 撑满内容区且占位图居中

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
