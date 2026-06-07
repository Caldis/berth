---
task: 2026-06-07-gh-112-plugin-component-cross-navigation
task_id: GH-112
type: feature
phase: explore
created: 2026-06-07
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/112
debt:
  estimate:
    incurred: 5
    repaid: 0
    net: 5
    scope: module
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算: 跨多组件页 (Skills/MCP/Hooks/子代理/命令/输出模式) + 插件页的双向关联标识与跳转, 需共享跨页定位/高亮/展开基础设施 (deep-link 路由 + scroll/highlight state) + 来源插件徽标。explore/design 后校准。"
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
  number: 112
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/112
  id: I_kwDOSpnDwc8AAAABEpKYnQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgu8wP8
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 插件↔能力关联标识 + 跨页一键双向跳转 (GH-112)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

目标: 插件提供的 mcp/hooks/skill/agent/command/output-mode 组件在各自页面显式标识来源插件并可一键跳转到插件页定位; 反之插件页组件项可一键跳转到组件页定位高亮。双向、跨页、含高亮/滚动/展开定位。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
