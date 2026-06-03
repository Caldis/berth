---
task: 2026-06-03-gh-87-navigation-title-duplication
task_id: GH-87
type: bug
phase: verify
created: 2026-06-03
priority: P2
target_date:
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 2
    repaid: 0
    net: 2
    scope: module
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "Explore 确认重复集中在 renderer 顶部 breadcrumb 与页面 h1, 涉及 TopNavigation 与现有 renderer/e2e 测试。"
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
    - at: 2026-06-03
      phase: explore
      from:
        incurred: 3
        net: 3
        risk: medium
        areas:
          - ui-ux
        confidence: low
      to:
        incurred: 2
        net: 2
        risk: low
        areas:
          - ui-ux
          - testability
        confidence: medium
      rationale: "影响面收窄到 renderer 顶部导航展示与相关测试, 不涉及 IPC、主进程或数据契约。"
issue:
  number: 87
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/87
  id: I_kwDOSpnDwc8AAAABEMRuww
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgujiF4
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Navigation Title Duplication

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
