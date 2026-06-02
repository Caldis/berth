---
task: 2026-06-02-gh-77-project-scope-switcher
task_id: GH-77
type: feature
phase: archive
created: 2026-06-02
priority: P2
target_date: 
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算; explore/design 后校准。"
  final:
    incurred: 2
    repaid: 1
    net: 1
    scope: module
    risk: low
    areas:
      - architecture
      - testability
    confidence: medium
    rationale: "新增应用级 project scope runtime 和 IPC, 但同步补齐 scanner/watch rebuild、项目 watcher 覆盖、renderer/e2e 测试与真实 Electron 验收。剩余净债主要是后续更多功能面继续接入项目域。"
  revisions: []
issue:
  number: 77
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/77
  id: I_kwDOSpnDwc8AAAABEI6olA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgugxig
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Project Scope Switcher

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
