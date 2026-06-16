---
task: 2026-06-16-gh-136-unify-collapsible-motion
task_id: GH-136
type: maintenance
phase: explore
created: 2026-06-16
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs:
    - GH-136
debt:
  estimate:
    incurred: 2
    repaid: 5
    net: -3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: low
    rationale: "0.0-new 初始估算; 抽共享 Collapsible 偿还 ui-ux 折叠一致性债 (area=18), 影响面 11 文件/13 处, explore/design 校准。"
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
  number: 136
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/136
  id: I_kwDOSpnDwc8AAAABFpGvhw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgv5_mA
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一折叠/手风琴组件: 抽共享 Collapsible 原语

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (user-request)
- [x] 01-ANALYSIS.md — Explore 初步产物 (静态分析已落盘; explore 收口需补官方文档验证, 见其"未决问题")
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 交接提示 (多设备续跑)
- 下一步: `harness-0.1-continue` (phase=explore)。explore 尚未收口, 需补两项官方文档验证 (HeroUI Accordion transition 行为 / react-virtuoso 动态高度在连续高度动画下的 re-measure), 再进 `harness-2.0-design`。
- 核心约束已查清: 约定页折叠 card 套在 VirtualGroupedList (react-virtuoso) 内, 不可整页换 HeroUI Accordion; 推荐抽共享 Collapsible (方案 B)。详见 01-ANALYSIS.md。

## 待澄清 (blocked 时填)
(无)
