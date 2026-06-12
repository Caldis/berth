---
task: 2026-06-13-gh-126-architecture-ui-consistency-review
task_id: GH-126
type: maintenance
maintenance:
  subtype: architecture
phase: implement
created: 2026-06-13
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/126
debt:
  estimate:
    incurred: 2
    repaid: 6
    net: -4
    scope: global
    risk: medium
    areas:
      - architecture
      - ui-ux
      - testability
      - performance
    confidence: medium
    rationale: "Explore 已确认首个高把握修复点: 筛选类 Select 的视觉契约散落在 4 个调用点。另记录 page chrome 注册和 project scope side effect 两个后续候选。估算仍按全局 UI/架构债务处理, 先用 T1 做可独立验证的小步偿还。"
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
      date: 2026-06-13
      from: { confidence: low }
      to: { confidence: medium }
      reason: "已完成 renderer/UI 调用点审计, 候选收敛为 FilterSelect、PageChrome builder、ProjectScope hook 三类; 第一类可小步实现并测试。"
issue:
  number: 126
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/126
  id: I_kwDOSpnDwc8AAAABFT24pw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvksW4
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 架构与 UI 一致性审计优化

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
