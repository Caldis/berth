---
task: 2026-07-05-gh-156-update-ux-sidebar
task_id: GH-156
type: maintenance
phase: explore
created: 2026-07-05
priority: P2
target_date: 
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 2
    repaid: 6
    net: -4
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
    confidence: low
    rationale: "0.0-new 初始估算: maintenance/ui-ux, 参考 bobcorn 重做更新交互 (侧边栏常驻入口 + 进度/错误/浮层), 预计偿还 ui-ux debt; 涉及 main updater 状态机与 renderer UI, scope=cross-process。explore/design 后校准。"
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
  number: 156
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/156
  id: I_kwDOSpnDwc8AAAABHuQ6Xg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgxyoX8
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 优化版本更新体验: 参考 bobcorn 侧边栏更新交互

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

参考 D:/Code/bobcorn 的更新交互与左侧边栏的更新检查/下载/进度展示/错误提示/更新内容浮层弹窗完整 UI/UX, 优化 berth 的版本更新功能与 UI 体验。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
