---
task: 2026-06-19-gh-144-god-pages-logic-sink
task_id: GH-144
type: maintenance
phase: design
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: testability
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-renderer-god-pages-logic-sink.md
debt:
  estimate:
    incurred: 1
    repaid: 3
    net: -2
    scope: module
    risk: low
    areas:
      - testability
    confidence: low
    rationale: "0.0-new 初始: 提取 session-detail/capabilities 内联纯函数到 lib + 直测 (incurred 少, 行为不变); 提升可测试性 + 减页面行数 (repaid); maintenance net -2; explore 以当前代码重新盘点纯函数后校准。"
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
  number: 144
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/144
  id: I_kwDOSpnDwc8AAAABGCivTA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwQXLM
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# renderer god-pages 纯逻辑下沉: session-detail/capabilities 内联纯函数抽 lib + 直测

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
