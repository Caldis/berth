# 01-ANALYSIS — Explore 产物

GH-150 第二轮: 总览 widget 高度三档 (内容密度档)。基于通读全部 16 widget + dashboard-grid/widget-shell/widget-catalog/widget-types/widget-grid/dashboard-layout/use-dashboard-layout。

## 现状理解

纯 **renderer 层**改动, 不碰 main 进程 / IPC 契约 / 数据引擎。涉及模块均在 `src/renderer/src/components/dashboard/` + `src/renderer/src/lib/`:

- **布局渲染**: `dashboard-grid.tsx` — CSS Grid (响应式 1/2/4 列) + 同行 `align-stretch` 等高 + 卡片 `h-full`。高度纯内容撑出, 同行取最高。无 JS 行高计算 (前轮删了 use-masonry-rows)。
- **卡壳**: `widget-shell.tsx` — 编辑态 header 渲染宽度档 `SegmentedTabs` (props: `w` / `widths` / `onSetWidth`) + 操作菜单。children 区已是 `min-h-0 flex-1` (撑满 cell)。
- **尺寸契约**: `widget-types.ts` — `WidgetWidth='W1'|'W2'|'W4'`; `WidgetSize={w}` (1 维, 前轮移除 h); `WidgetMeta` 含 `defaultSize`/`widths`/`defaultOrder`/`defaultHidden`; `WidgetRenderProps={w, chartType?, onChartTypeChange?}`。
- **元数据真源**: `widget-catalog.ts` — 16 widget 各一条 `WidgetMeta`。
- **宽度映射**: `widget-grid.ts` — `widthColSpanClass(w)` → Tailwind col-span 字面量。
- **持久化**: `dashboard-layout.ts` — `WidgetLayoutItem={id,size,hidden,chartType?}`; `normalizeSize`/`clampSize`/`LEGACY_SIZE_MAP` 当前只处理 `w` (注释证实历史 v2 曾有 `{w,h}`, 前轮归一丢 h); `DASHBOARD_LAYOUT_VERSION=2`。
- **布局状态**: `use-dashboard-layout.ts` — `setWidth(id,w)` 函数式更新 + localStorage 写。`setHeight` 可完全对称新增。

## 16 widget 内容弹性分级 (核心)

判据: 增加高度能否带来**信息增益**。这是「谁暴露谁固定」的唯一依据, 也是修「无实感」根因的落点。

| 弹性 | Widget (id) | 增高换来 | 当前写死 | heights |
|---|---|---|---|---|
| **强** 列表行数 | recent-sessions | 多显示会话行 | `limit = w==='W1'?3:5` (IPC limit) | H1/H2/H3 |
| | top-usage | 更长榜单 | `slice(0,5)` (W1=3) | H1/H2/H3 |
| | model-distribution | 更多模型/agent | `slice(0, w==='W1'?4:8)` | H1/H2/H3 |
| | model-efficiency | 更多模型行 | `slice(0, w==='W1'?3:6)` | H1/H2/H3 |
| | project-allocation | 更多项目行 | `slice(0, w==='W1'?4:8)` | H1/H2/H3 |
| **中** 图表纵向 | usage-trend | 图更高 + 轴/网格 | `chartHeight=150` 写死 (注释「随尺寸递增」未实现) | H2/H3 |
| | session-duration | 更高直方图 | `chartHeight = w==='W4'?200:150` | H2/H3 |
| | cumulative-growth | 曲线更舒展 | `chartHeight = w==='W4'?200:150` | H2/H3 |
| | model-trend | 多线更清 + 图例 | `chartHeight = w==='W4'?200:150` | H2/H3 |
| | spend | 更高柱状 | `chartHeight = w==='W4'?180:130` | H2/H3 |
| | token-breakdown | bar→pie/donut 大图 | `chartHeight=140` (bar 形态为细条+legend) | H2/H3 |
| **固定** 结构/数量固定 | stats-band | 只增留白 (5 指标横带) | grid 5 列 | H2 |
| | quick-actions | 只增留白 (4 入口) | grid 2/4 列 | H2 |
| | activity-heatmap | 格变大无信息增益 (7×N 横向驱动) | aspect-square | H2 |
| | activity-rhythm | 同上 (7×24) | aspect-square | H2 |
| | activity-insights | 行数固定 (5 行 dl + 占比条) | 固定 5 行 | H2 |

注: 强/中 = 暴露 (heights 多档); 固定 = 单档 `['H2']` 无切换器。共 **11 暴露 + 5 固定**。token-breakdown 归中 (形态切换已有, 高度档控 pie/donut 大小)。

## 关联与依赖 (符号边界 blast radius)

按 import / 类型引用 / JSX 使用点判定 (非 grep 子串)。改动符号闭合在 **dashboard 模块 + overview.tsx**, 无外部消费者 (前轮已确认):

- `WidgetSize` 加 `h` → 消费者: `widget-catalog` (defaultSize)、`dashboard-layout` (WidgetLayoutItem.size + normalizeSize/clampSize)、`use-dashboard-layout` (setHeight)。
- `WidgetMeta` 加 `heights[]` → 消费者: `widget-catalog` (16 条)、`dashboard-layout` (clampSize 读 heights)、`widget-shell` (heights prop)。
- `WidgetRenderProps` 加 `h` → 消费者: **16 widget 组件签名** + `dashboard-grid` 的 `<Component>` 调用。弹性 widget 用 (w,h) 算 limit/chartHeight; 固定 widget 忽略 h。
- `useDashboardLayout` 加 `setHeight` → `overview.tsx` 透传 → `DashboardGrid` props `onSetHeight` → `WidgetCard` → `WidgetShell`。
- `widget-grid` 加高度相关纯函数 (如 `heightTierClass` 或 chartHeight 基线映射)。

无 IPC / main / 跨进程改动。无新依赖。

## 持久化迁移面

`dashboard-layout.ts` 三处扩 h (零回归关键):
1. `LEGACY_SIZE_MAP` 各项补 `h:'H2'` (v1 字符串 → {w, H2})。
2. `clampSize` 加 `h = meta.heights.includes(size.h) ? size.h : meta.defaultSize.h`。
3. `normalizeSize` 对 v2 `{w}` (前轮存量, 无 h) → 补 `meta.defaultSize.h` (=H2) → **旧用户布局自动落 H2 = 零回归**。
4. `DASHBOARD_LAYOUT_VERSION` 2→3 (schema 演进显式化; migrate 仍容旧)。

## 验收标准 (逐条编号, SPEC/verify 据此)

- **AC1** 默认布局 (全 H2) 对当前概览**像素级零回归** (实测窗口坐标裁剪比对截图)。
- **AC2** 11 个弹性 widget 高度档可切换, H1/H3 内容密度**肉眼可分** (逐组件 × 逐档 CDP 截图)。
- **AC3** 5 个固定 widget (stats-band/quick-actions/activity-heatmap/activity-rhythm/activity-insights) **不渲染**高度切换器。
- **AC4** 高度档选择持久化进 localStorage layout, 刷新保留; 旧 layout (无 h) 迁移补 H2 不崩、不变样。
- **AC5** 切换档 / 拖拽时 framer layout 高度过渡平滑, 无内容变形。
- **AC6** 图表类 H2 保持当前 `chartHeight` 原值原行为; 「填满等高消留白」仅 H3 启用。
- **AC7** typecheck/lint/test 全绿; 新增单测 (widget-grid 高度映射 / catalog heights 完整性含「必含 H2」/ layout 迁移补 H2) 通过。

## 界面质量与交互验收 (现状记录)

- **设计系统**: widget-shell 卡壳 (border + shadow-sm + p-3 + hover 浮起), 编辑态宽度档 `SegmentedTabs`, 克制安静 (无 gray slab, 单色相强调)。
- **信息密度**: 同行等高, 矮卡底部留白 (用户已接受「等高 > 零留白」)。
- **切换器**: 高度档加在宽度档旁 (第二组 SegmentedTabs); header 挤则收进 MoreHorizontal 菜单 (design 定)。
- **状态**: 仅编辑态显示切换器; 固定类永不显示; 窄宽 (W1) 下 h 档与简版逻辑协同。
- **i18n**: 高度档 label (紧凑/标准/加长) 需补 i18n key, 复用现有 overview.dashboard.* 命名空间。
- **过渡**: framer-motion `layout` 已接管非拖拽布局变化, 档位切换的高度变化自动 FLIP, 无需新增动画。

## 未决问题 (design 自行决策, 写明假设, 不阻塞)

- **Q1 三档命名**: 假设数据层 `H1/H2/H3` (中性, 防「空间高度」误解), UI 显示图标或「紧凑/标准/加长」。(用户上轮倾向中性)
- **Q2 W1 窄宽下是否给 h 档**: 假设保留但行数上限受窄宽约束 (列表 H3 在 W1 下封顶较低); 图表 W1 罕见 (多数图表 widths 不含 W1)。
- **Q3 layout version**: 假设升 3, migrate 容 v1/v2。

均为实现细节, 不构成 PRD 级歧义 → 不 blocked, design 写假设继续。

## debt 校准

影响面确认: 跨 ~15 文件但符号边界闭合在 dashboard 模块 + overview.tsx, 无外部消费者; H2≡现状把默认态 blast radius 压到零 (可灰度)。落地路径已具体到函数级。
→ `confidence: medium → high`; incurred 4 / repaid 0 / net 4 维持; scope module / risk medium 维持 (risk 待 design 测试矩阵最终校准)。见 INDEX `debt.revisions[]`。
