---
task: 2026-06-04-gh-101-unify-empty-state
task_id: GH-101
type: bug
phase: archive
created: 2026-06-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - GH-101
debt:
  estimate:
    incurred: 2
    repaid: 1
    net: 1
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 校准; 共享组件加 fullHeight + 6+ renderer 文件接 flex 高度链; 删除 capabilities 本地实现 (偿还)。页面根改 flex 可能波及非空列表布局, risk 升 medium。"
  final:
    incurred: 2
    repaid: 2
    net: 0
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: high
    rationale: "实现收口: 共享组件加 fullHeight + PAGE_EMPTY_FILL, 6 个 renderer 文件接 flex 高度链, 删除 capabilities 本地同名 EmptyState (消除同名遮蔽)。担心的非空列表布局回归未出现 (列表为自包含 min-h 块, 不受根 flex 影响), 故 risk 实测 low。targeted 测试全绿; T1-T3 已随 cea0440 远端 CI 绿灯。repaid 上调到 2 (移除整套分叉实现 + 防未来漂移)。"
  revisions:
    - phase: explore
      date: 2026-06-04
      from: { risk: low }
      to: { risk: medium }
      reason: "页面根接 flex 高度链可能波及非空列表布局; 改动文件数 6+。"
    - phase: verify
      date: 2026-06-04
      from: { risk: medium }
      to: { risk: low }
      reason: "非空分支为自包含 min-h 块, 实测未受根 flex 影响; targeted 测试全绿, 远端 CI (cea0440, 含 T1-T3) 绿灯。"
issue:
  number: 101
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/101
  id: I_kwDOSpnDwc8AAAABEZBazg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvNok
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一全站空态样式: 撑满内容区且占位图居中

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
