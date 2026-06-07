---
task: 2026-06-07-gh-112-plugin-component-cross-navigation
task_id: GH-112
type: feature
phase: archive
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
    incurred: 5
    repaid: 0
    net: 5
    scope: module
    risk: low
    areas:
      - ui-ux
      - architecture
    confidence: high
    rationale: "纯渲染层新特性 (数据已齐): 共享基建 (asset-route/use-focus-target/PluginOriginBadge/plugin-origin) + 4 页接入 (插件/instructions/MCP/Hooks) 双向跳转+来源徽标+定位高亮。复用 search-dialog routeForAsset 与 memory-view 聚焦范式降复杂度。13 个提交全测试覆盖 (7 个新测试文件 33 用例) + 全量回归 117 文件 764 + scan-engine 24 + build + harness:check 全绿 + agent 冷启双向实测。risk medium→low、confidence low→high (实现顺利无架构意外, 无后端改动)。incurred 维持 5 (新增 UI 表面与跨页焦点契约)。"
  revisions:
    - phase: verify
      date: 2026-06-07
      from: { risk: medium, confidence: low }
      to: { risk: low, confidence: high }
      reason: "explore 实测数据全齐 (meta.pluginId 已有) + 可复用基建 (routeForAsset/memory-view 焦点范式) 充分, 实现纯渲染层无后端改动, 全测试覆盖 + 冷启双向实测通过, 残余风险与不确定性下降。net/scope/areas 维持。"
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
  item_status: Done
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
- [x] 01-ANALYSIS.md — Explore 产物 (Workflow 5 路并行探查综合)
- [x] 02-SPEC.md — Design 产物 (焦点传输 + 每页 locator + 徽标 + 测试矩阵)
- [x] 03-PLAN.md — 活任务清单 (P1–P5)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
