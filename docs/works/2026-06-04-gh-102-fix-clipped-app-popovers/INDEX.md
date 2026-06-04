---
task: 2026-06-04-gh-102-fix-clipped-app-popovers
task_id: GH-102
type: bug
phase: verify
created: 2026-06-04
priority: P2
target_date: 
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 2
    repaid: 0
    net: 2
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "0.0-new 初始估算; 影响 renderer header 与 Hooks lifecycle sidebar 的浮层组件, 预期以共享 Radix-backed 组件修复裁剪问题。"
  final:
    incurred: 2
    repaid: 0
    net: 2
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: high
    rationale: "最终 diff 限定在 renderer 共享浮层组件、两处调用点、对应 renderer 测试和依赖锁; prepush 与 Electron 真实窗口截图通过。剩余风险是其他未点名浮层若也有裁剪问题, 需后续单独收敛。"
  revisions: []
issue:
  number: 102
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/102
  id: I_kwDOSpnDwc8AAAABEZBvWA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguvNn8
  item_status: In Progress
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 修复 header 与 Hooks 检查浮层被裁剪

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
