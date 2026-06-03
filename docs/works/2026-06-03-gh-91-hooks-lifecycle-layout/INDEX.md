---
task: 2026-06-03-gh-91-hooks-lifecycle-layout
task_id: GH-91
type: feature
phase: verify
created: 2026-06-03
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/91
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "0.0-new 初始估算; Hooks 页面布局、滚动同步与连线视觉改造, explore/design 后校准。"
  final:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "Renderer 单组件布局与测试改造; 主进程、IPC 与数据契约未变。"
  revisions:
    - phase: explore
      date: 2026-06-03
      from:
        confidence: low
      to:
        confidence: medium
      reason: "Explore 已定位到单一 renderer 组件与现有测试文件, 风险仍为 module/medium。"
issue:
  number: 91
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/91
  id: I_kwDOSpnDwc8AAAABEPDh8g
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgumNfA
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Optimize Hooks lifecycle layout

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
