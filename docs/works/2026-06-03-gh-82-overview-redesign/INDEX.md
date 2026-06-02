---
task: 2026-06-03-gh-82-overview-redesign
task_id: GH-82
type: feature
phase: implement
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-FEATURE-overview-redesign.md
debt:
  estimate:
    incurred: 5
    repaid: 0
    net: 5
    scope: cross-process
    risk: high
    areas:
      - architecture
      - testability
      - ui-ux
    confidence: medium
    rationale: "0.0-new 初始估算; 首页重构涉及 overview renderer、健康状态、最近会话、项目范围入口和视觉验收, explore/design 后校准。"
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
        confidence: low
      to:
        confidence: medium
      rationale: "Explore 确认首页重构集中在 renderer 页面、i18n 与测试, 不需要新增 IPC 或主进程契约; 影响面仍覆盖多数据源和首页视觉, scope/risk 暂不降低。"
issue:
  number: 82
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/82
  id: I_kwDOSpnDwc8AAAABEK1ZZg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiYuQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Overview Redesign

任务索引与交接锚。phase 字段为唯一状态源, harness-0.1-continue 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
