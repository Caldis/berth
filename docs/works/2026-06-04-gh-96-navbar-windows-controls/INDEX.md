---
task: 2026-06-04-gh-96-navbar-windows-controls
task_id: GH-96
type: feature
phase: verify
created: 2026-06-04
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/96
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
    rationale: "导航栏与 Windows 标题栏避让属于 renderer app shell 层 UI 调整; explore/design 后再校准影响面。"
  final:
    incurred: 2
    repaid: 1
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: high
    rationale: "实现集中在 renderer app shell: 首页使用现有 TopNavigation, Windows 控制键按导航栏高度居中, 右侧 padding 调整为 13rem; 新增/更新 renderer 单测并通过 e2e 与截图坐标验证。剩余 net=1 来自共享导航栏改动仍覆盖所有页面。"
  revisions:
    - phase: verify
      date: 2026-06-04
      from:
        net: 3
        risk: medium
        areas:
          - ui-ux
        confidence: medium
      to:
        net: 1
        risk: low
        areas:
          - ui-ux
          - testability
        confidence: high
      reason: "目标测试、全量检查、Windows e2e 和截图坐标均通过; 实现未触及 IPC/主进程契约, 并补充了 app shell 行为测试。"
issue:
  number: 96
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/96
  id: I_kwDOSpnDwc8AAAABERnx6Q
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguoiT8
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Navbar Windows Controls

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
