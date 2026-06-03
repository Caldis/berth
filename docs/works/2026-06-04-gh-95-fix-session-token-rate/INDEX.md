---
task: 2026-06-04-gh-95-fix-session-token-rate
task_id: GH-95
type: bug
phase: verify
created: 2026-06-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/95
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "explore/design 确认影响面集中在 sessions:get activity metrics 和测试; 不改 parser、IPC 类型或页面布局。"
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
      from:
        confidence: low
      to:
        confidence: medium
      reason: "已定位异常来自主进程 token rate 生成逻辑, 不是跨 parser 或 renderer 布局问题。"
issue:
  number: 95
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/95
  id: I_kwDOSpnDwc8AAAABERdLdA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguoZdo
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Fix Session Token Rate

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始缺陷描述快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
