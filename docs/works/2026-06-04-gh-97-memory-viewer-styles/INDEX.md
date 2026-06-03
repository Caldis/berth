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
    incurred: 3
    repaid: 3
    net: 0
    scope: module
    risk: low
    areas:
      - ui-ux
      - architecture
      - testability
    confidence: high
    rationale: "实现集中在 renderer: 标签筛选改为一行加可滚动浮层, 原始文件查看器抽为共享 FileViewerDrawer/FileViewerButton, 资产与记忆入口复用同一逻辑; 新增 renderer 测试覆盖平台安全区、拖曳宽度、focus/copy/close 与记忆入口。剩余风险主要是 macOS 原生 traffic-light 只能通过平台分支和 renderer 断言验证。"
  revisions:
    - phase: verify
      date: 2026-06-04
      from:
        net: 5
        scope: cross-process
        risk: medium
        areas:
          - ui-ux
          - architecture
        confidence: medium
      to:
        net: 0
        scope: module
        risk: low
        areas:
          - ui-ux
          - architecture
          - testability
        confidence: high
      reason: "实现未触及主进程、preload 或 IPC 契约; 抽出共享文件查看器并补齐 renderer / e2e / 视觉证据, 因此 final scope 收窄、risk 降低。"
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
