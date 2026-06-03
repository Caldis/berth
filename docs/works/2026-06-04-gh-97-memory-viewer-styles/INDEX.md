---
task: 2026-06-04-gh-97-memory-viewer-styles
task_id: GH-97
type: bug
phase: verify
created: 2026-06-04
priority: P1
target_date: 
source:
  kind: github-issue
  refs:
    - https://github.com/Caldis/berth/issues/97
debt:
  estimate:
    incurred: 5
    repaid: 0
    net: 5
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: medium
    rationale: "记忆页标签布局、原始文件查看器层级、公共组件复用与拖曳宽度会影响多个 renderer 入口; explore/design 后校准。"
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
  number: 97
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/97
  id: I_kwDOSpnDwc8AAAABERqB-w
  state: OPEN
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguokG4
  item_status: In Progress
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 修复记忆模块标签与原始文件查看器样式

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
