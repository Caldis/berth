---
task: 2026-06-23-gh-150-widget-height-tiers
task_id: GH-150
type: feature
phase: archive
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
    incurred: 8
    repaid: 1
    net: 7
    scope: module
    risk: high
    areas:
      - ui-ux
      - architecture
    confidence: medium
    rationale: "范围质变为『概览重构为二维 CSS Grid dashboard 引擎』(用户真实目标=完全自定义可拼接 dashboard + 持续加丰富小组件)。incurred 8: 数值 span 契约替代 WidgetWidth 枚举 + 自研 CSS Grid 引擎 (12 列响应式 + auto-rows + dense) + 自研 resize 手柄 + 16 widget 接入层2 内容自适应 + 持久化 schema 迁移 (v2 W档→span) + dnd-kit 拖放复用。repaid 1 (删 widthColSpanClass/宽度 SegmentedTabs/同行等高 hack, 统一网格)。risk high (整个概览布局模型替换 + 数据迁移 + 自研 resize/响应式)。scope module (限 dashboard+overview, 无外部消费者)。confidence medium (自研引擎+响应式+resize 需 CDP 实测校准)。库决策: 查证 react-grid-layout 2.x 残留 react-draggable(findDOMNode)+react-resizable 等 4 遗留 dep, peer 无 React19 上限, 不押兼容赌注 → 自研 CSS Grid + 复用已有 dnd-kit 6.3。"
  final:
    incurred: 8
    repaid: 2
    net: 6
    scope: module
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: high
    rationale: "二维 CSS Grid dashboard 引擎落地并 CDP 实测收敛: 行单元 28px + per-widget defaultSize.h 按实测内容自然高校准 (信息带 148px / 图表-热力图 228px / 内容高者按需给足), widget-shell 内容区 grid-rows-1 单格 1fr 统一撑满子节点 (根治 h-full 在 flex-grow 父不解析的死白), layout v4 migrate 重置旧 88px 语义 h。验收: CDP 1680 宽窗真实数据全 widget clip=0, typecheck 0 / 1314 测试 / lint 0 / electron-vite build 4633 模块。repaid 2: 消除旧高矮档 short/tall + 同行等高 hack + 宽度档与高度统一进 span 模型。risk high→medium (已实测工作, 残留仅列表行数 hand-tuned 乘数 + per-widget 高度按当前内容密度校准, 内容显著变化需重调; 非阻塞)。confidence high (CDP 实测闭环)。"
  revisions:
    - phase: explore
      date: 2026-06-23
      field: confidence
      from: medium
      to: high
      reason: "explore 通读全部 16 widget + 持久化层, 落地路径具体到函数级。incurred/net 维持 4, confidence medium→high。"
    - phase: design
      date: 2026-06-23
      field: scope/incurred/areas/risk/confidence
      from: "高度三档内容密度档; incurred 4 / risk medium / [ui-ux] / confidence high"
      to: "二维 dashboard 引擎; incurred 8 / risk high / [ui-ux, architecture] / confidence medium"
      reason: "用户确认真实目标=完全自定义可拼接 dashboard。范围从加高度档质变为概览重构为 CSS Grid 二维网格引擎 (数值 span 契约 + 自研引擎+resize + dense 填空 + 16 widget 接入层2 内容自适应)。零回归降级: 默认态贴合内容最小高度 (消留白, 用户指示), 非像素级现状。自研非 RGL (React19 findDOMNode 风险)。两层架构: 引擎(层1) + 内容自适应(层2, 复用并推广 01-ANALYSIS)。"
    - phase: verify
      date: 2026-06-24
      field: incurred/repaid/risk/confidence
      from: "incurred 8 / repaid 1 / risk high / confidence medium (待 CDP 校准)"
      to: "incurred 8 / repaid 2 / net 6 / risk medium / confidence high"
      reason: "CDP 实测闭环: 行单元 88→28px 细化 + per-widget 默认高按实测内容自然高校准 (用户两轮反馈: 信息类留白过大 → 信息带 148px、图表/热力图 228px、内容高者按需给足) + widget-shell grid-rows-1 统一撑满 (根治 h-full 不解析死白) + layout v4 migrate 重置旧 h。全 widget clip=0 / 1314 测试 / build 4633 模块。"
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

# 总览二维 dashboard 引擎 (GH-150 第二轮)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 任务归属

GH-150 第二轮, **复用 issue #150** (仍 OPEN, project item 仍 In Progress)。第一轮「拖拽 UX 大修」已 archive (`docs/works/2026-06-22-gh-150-overview-drag-ux-overhaul/`)。本轮范围在对话中**两次演进**: 高度三档 (内容密度档) → 用户确认真实目标后质变为「概览重构为完全自定义、可任意拼接的二维 dashboard 引擎」。#150 原始 PRD 第 4 点「几组固定高度…固定整数倍不留空隙」正是本引擎的本意。

## 范围

概览重构为二维 CSS Grid dashboard 引擎, **两层架构**:
- **层1 引擎**: 12 列响应式网格 + `grid-auto-rows` + `grid-row/column: span` + `grid-auto-flow: dense` 填空; dnd-kit 拖放 (复用) + 自研 resize 手柄。
- **层2 内容自适应**: widget 收整数 (w,h) span, 纯函数算内容 (列表行数/图表填满+细节/固定类锁定); **复用并推广 01-ANALYSIS 弹性分级** (从 3 离散档→span 驱动)。
- **数值 span 契约**: `WidgetSize{w,h:number}` + `minSize`/`maxSize` 替代 `WidgetWidth` 枚举。
- **默认尺寸 = 内容最小贴合 (用户指示 2026-06-23)**: 快捷入口/TOKEN 构成/花费等内容少的 widget `defaultSize.h` 取最小, 消留白; 非沿用现状留白高度。`minSize ≤ defaultSize`, 固定类 `min=default`。
- 持久化迁移: v2 `{W档}` → span 映射, version 3。

## 不做 (边界)

- Level 2 绝对 `{x,y}` 定位 + 碰撞 (未来, 记 docs/issues; 本轮 `{w,h}` 向前兼容)。
- 第三方 grid 库 (react-grid-layout / Gridstack; 查证后自研, 见 debt rationale)。

## 产物

- [x] 00-PRD.md — 本轮诉求快照 (高度档 → 引擎演进记录)
- [x] 01-ANALYSIS.md — Explore 产物 (16 widget 内容弹性分级; 层2 地图, 仍有效)
- [x] 02-SPEC.md — Design 产物 v2 (dashboard 引擎 + 库决策 + 两层架构 §12)
- [x] 03-PLAN.md — 活任务清单 v2 (引擎 + 内容层实现项)
- [ ] 04-POLISH.md — 可选抛光记录

## 实施进展 (代码完成)
- [x] 引擎全链 (catalog/layout v3/dashboard-grid/use-dashboard-layout/widget-shell/overview)
- [x] resize (use-resize-handle, deltaToSpan 单测)
- [x] P10 图表填满 (height:100%) + 列表 rows=f(h)
- [x] (本轮 b61b7d21/80536fc9/eb083445) 修复构建报错 ({w,h,h} 参数重名) + 死变量 chartHeight/marker 清理 + project-allocation/model-efficiency 列表高度自适应 (与 recent-sessions/top-usage 同律) + 打通 resize 链路 (DashboardGrid/WidgetCard 透传 onSetHeight + h/minH/maxH, 此前 canResize 恒 false 手柄不渲染) + dashboard-layout 单测对齐 hybrid schema (13/13)
- [x] (本轮 6c7faccd) 补齐 widget-types/widget-grid hybrid 契约 (WidgetSize.h 必填 / WidgetMeta.minH+maxH? / WidgetRenderProps.h? / widget-grid.gridRowSpanStyle), 消除运行时 SyntaxError。验收: pnpm typecheck 归零 · 1314 测试全绿 (含 renderer 挂载 DashboardGrid) · electron-vite build 成功 (4633 模块)
- [x] (本轮 a6756a27) widget-shell 内容区 grid-rows-1 单格 1fr 统一撑满子节点, 根治 h-full 在 flex-grow 父不解析的死白 (stats-band 居中 / heatmap 格子纵向拉伸填满); 顺带修复全部图表未填满
- [x] (本轮 f081228a) CDP 实测校准: 行单元 88→28px + gap-3, per-widget 默认高按实测内容自然高贴合 (信息带 200→148px / 图表-热力图 312→228px / insights·recent-sessions 等内容高者按需给足避免裁切); 列表行数公式随新 h 重标定; widget-shell PX_PER_SPAN 112→40; layout v3→v4 migrate 重置旧 88px 语义 h (保留 w/排序/隐藏/chartType)。CDP 1680 宽窗真实数据全 widget clip=0
- [x] (本轮 797c5887) 用户反馈: 统一 最常用/最近会话 默认高度 (均 h=10, 388px)
- [x] 验收闭环: typecheck 0 / 1314 测试 / lint 0 / electron-vite build 4633 模块 / CDP 实测无裁切无死白

## 已知残留 (非阻塞)
- 列表行数用 hand-tuned 乘数 (round(h*k)) + per-widget 默认高按当前内容密度 CDP 校准; widget 内容显著变化时需重调 (理想解: ResizeObserver 测真实行高自动填行, 体量不值当前做, 记此备忘)。
- 用户运行态需重启 `pnpm dev`/刷新窗口让 layout v4 migrate 生效 (HMR 保留旧 layout state)。

## 待澄清 (blocked 时填)
(无)
