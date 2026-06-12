---
task: 2026-06-13-gh-125-unify-search-inputs
task_id: GH-125
type: feature
phase: design
created: 2026-06-13
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/125
debt:
  estimate:
    incurred: 4
    repaid: 1
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "Explore 确认影响面集中在 renderer 顶部导航、侧栏全局搜索入口、全局搜索弹窗输入和少数页面 placeholder; 追加标题栏固定高度验收后仍是模块级 UI/test 变更。"
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
    - at: explore
      date: 2026-06-13
      from:
        incurred: 4
        repaid: 1
        net: 3
        confidence: low
      to:
        incurred: 5
        repaid: 2
        net: 3
        confidence: medium
      reason: "用户追加会话列表到详情页标题栏高度抖动要求; 同时计划用共享搜索控件收敛重复样式, 净 debt 不变。"
issue:
  number: 125
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/125
  id: I_kwDOSpnDwc8AAAABFTXgEw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvkRJo
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一标题栏与侧栏搜索输入框

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
