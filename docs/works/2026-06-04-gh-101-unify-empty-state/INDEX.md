---
task: 2026-06-04-gh-101-unify-empty-state
task_id: GH-101
type: bug
phase: implement
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
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 校准; 共享组件加 fullHeight + 6+ renderer 文件接 flex 高度链; 删除 capabilities 本地实现 (偿还)。页面根改 flex 可能波及非空列表布局, risk 升 medium。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions:
    - phase: explore
      date: 2026-06-04
      from: { risk: low }
      to: { risk: medium }
      reason: "页面根接 flex 高度链可能波及非空列表布局; 改动文件数 6+。"
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
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
