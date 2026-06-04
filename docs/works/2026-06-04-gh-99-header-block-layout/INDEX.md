---
task: 2026-06-04-gh-99-header-block-layout
task_id: GH-99
type: maintenance
phase: implement
created: 2026-06-04
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/99
debt:
  estimate:
    incurred: 2
    repaid: 5
    net: -3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "悬浮 header 测高/偏移补偿机制集中在布局外壳 (app-layout/top-navigation) + 两个 sticky 消费者 (category-jump-nav/hooks-lifecycle-view) + 对应测试; 改块布局可移除 ResizeObserver 测高、--berth-page-top-offset 间接层、paddingTop/scrollPaddingTop 补偿, 净偿还。风险 medium: 全局布局所有页面依赖, 但改动机械。explore/design 后校准。"
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
      from: { net: -3, confidence: low }
      to: { net: -3, confidence: medium }
      reason: "并行逐页审计确认 6 个路由页本体零改动, 改动面收敛到 6 文件 + ~6 测试; net 不变, confidence low->medium。"
issue:
  number: 99
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/99
  id: I_kwDOSpnDwc8AAAABEZADIQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvML0
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 重构应用 header 为普通块布局, 移除悬浮补偿机制

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
