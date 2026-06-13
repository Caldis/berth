---
task: 2026-06-13-gh-130-shortcut-conflict-between-searches
task_id: GH-130
type: bug
phase: implement
created: 2026-06-13
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/130
debt:
  estimate:
    incurred: 2
    repaid: 0
    net: 2
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: low
    rationale: "0.0-new 初始估算; 快捷键冲突影响全局搜索与页面内搜索两个入口, 需核对触发链路、显示文案和测试覆盖。"
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
  number: 130
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/130
  id: I_kwDOSpnDwc8AAAABFWYJjw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvmnkY
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 区分全局搜索与页面内搜索快捷键

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
