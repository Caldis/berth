---
task: 2026-06-23-gh-150-widget-height-tiers
task_id: GH-150
type: feature
phase: design
created: 2026-06-23
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - docs/works/2026-06-22-gh-150-overview-drag-ux-overhaul/INDEX.md
    - docs/friction/20260622-3.0-implement-dashboard-height-iteration-tradeoff.md
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: high
    rationale: "在 GH-150 第一轮『同行等高』基线上加回 per-widget 高度档 (语义=内容密度档, 非空间高度)。影响面: widget-types/widget-catalog/widget-grid/widget-shell/dashboard-grid + ~11 弹性 widget + dashboard-layout 持久化迁移 + 测试矩阵。incurred 4 (跨多 widget + WidgetSize schema 二维化 + 迁移; 但 H2≡现状零回归约束把默认态 blast radius 压到零, 可灰度); repaid 0 (纯 feature, 图表填满消留白降级为 H3 故默认不还债); risk medium 待 design 校准; scope module (限 dashboard, 前轮已确认无外部消费者、符号边界闭环)。"
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
      date: 2026-06-23
      field: confidence
      from: medium
      to: high
      reason: "explore 通读全部 16 widget + 持久化层, 落地路径具体到函数级 (WidgetSize/WidgetMeta/WidgetRenderProps 符号边界闭合在 dashboard 模块 + overview.tsx, 无外部消费者; dashboard-layout 三处扩 h 迁移补 H2 零回归)。incurred/net 维持 4, confidence medium→high。"
issue:
  number: 150
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/150
  id: I_kwDOSpnDwc8AAAABGO6dsQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwa7Js
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 总览 widget 高度三档 (内容密度档回归 · GH-150 第二轮)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 任务归属

GH-150 第二轮。第一轮「拖拽 UX 大修」(`docs/works/2026-06-22-gh-150-overview-drag-ux-overhaul/`) 已 archive, 布局收敛为同行等高并移除旧高矮档 (切换无实感)。本轮**复用 issue #150** (仍 OPEN, project item 仍 In Progress, 主题一致): #150 原始 PRD 第 4 点本就要求「几组固定高度…固定整数倍」, 本轮回归该诉求, 但把语义从「空间高度」改为「内容密度档」以根治无实感。复用同一 `gh_project.item_id`; 不新建 issue。

## 范围

加回 per-widget 高度三档 (H1/H2/H3 = 内容密度档):
- 数据模型: WidgetSize 加 `h`; WidgetMeta 加 `heights[]`; catalog 加 `defaultSize.h` + `heights`。
- 弹性 widget 暴露切换 (列表=行数, 图表=高度+细节); 固定 widget 单档无切换器。
- 硬约束: H2 ≡ 现状, 默认布局 (全 H2) 像素级零回归。

## 不做 (边界)

- 不改同行等高布局模型 (align-stretch + h-full 保留)。
- 不改拖拽架构 (dnd-kit sortable + framer layout 不动)。
- 不引入 resize 手柄 / 二维自由网格 / 全局密度模式 (已被用户否决)。
- 图表「填满等高」消留白只在 H3 启用, 不进默认档。

## 产物

- [x] 00-PRD.md — 本轮诉求快照
- [x] 01-ANALYSIS.md — Explore 产物 (16 widget 内容弹性分级)
- [ ] 02-SPEC.md — Design 产物 (三档映射 + 落地机制 + 测试矩阵)
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
(无)
