---
task: 2026-07-05-gh-156-update-ux-sidebar
task_id: GH-156
type: maintenance
phase: design
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
    confidence: medium
    rationale: "explore 校准 (2026-07-05): 影响面确认 — renderer 为主 (sidebar footer 新指示器 + 浮层, 复用 FloatingPopover/use-update) + main updater 小改 (自动检查错误静默), IPC 契约零通道变化; 数值维持 incurred 2 / repaid 6 / net -4。"
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
      date: 2026-07-05
      from: "confidence low"
      to: "confidence medium (数值不变)"
      reason: "explore 完成: bobcorn 参考模型与 berth 现状全链路调查落 01-ANALYSIS; blast radius 收敛为 renderer layout 域新组件 + main updater 错误分级小改, IPC 零通道变化。"
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
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
