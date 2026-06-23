# 02-SPEC — Design 产物 (v2: dashboard 引擎)

> **范围质变 (2026-06-23)**: 用户确认真实目标 = "完全自定义、任意拼接组合的 dashboard, 持续增加丰富小组件"。任务从「在同行等高布局上加高度档」升级为「概览重构为二维网格 dashboard 引擎」。v1 SPEC (fixed 高度档 + 等高) 作废, 本文覆盖。零回归降级: 不再像素级零回归, 默认布局 span 校准到 ≈ 现状即可。

回指 01-ANALYSIS 弹性分级 (仍有效) + 新验收 AC1'–AC9' (见 §9)。

## 1. 库决策 (不变量 9: 已查官方 package.json/changelog/React issue)

**自研 CSS Grid 引擎 + 复用 dnd-kit; 不引入 react-grid-layout / Gridstack。**

| 候选 | 否决/采纳理由 |
|---|---|
| react-grid-layout 2.x | deps 残留 `react-draggable ^4.4.6` (依赖 React 19 已**移除**的 findDOMNode) + react-resizable + prop-types + resize-observer-polyfill; peer `react>=16.3` 无上限, v2 hooks 重写"more compatible"但未声明 fully。berth=React 19 → 押兼容赌注 + 4 遗留 dep。**否决**。 |
| Gridstack.js | battle-tested 但命令式 (HTML id/selector 注入), 逆 berth 纯函数式 React 19 范式。**否决**。 |
| 自研 CSS Grid + dnd-kit | CSS Grid (`repeat(12,1fr)` + `grid-auto-rows` + `grid-column/row: span` + `auto-flow dense`) 原生二维网格+填空, 零依赖零 React19 风险; 拖放复用已有 dnd-kit 6.3; resize 手柄自研。**采纳**。 |

## 2. 网格引擎 (dashboard-grid.tsx 重写)
```
display: grid
grid-template-columns: repeat(var(--cols), 1fr)   /* cols 响应式: base1 / sm2 / md4 / lg8 / xl12 */
grid-auto-rows: var(--row-unit)                    /* row-unit 初值 ~96px, 实现时 CDP 校准 */
gap: 24px (维持现状)
grid-auto-flow: row dense                          /* 自动填空隙 = 任意拼接 */

.widget {
  grid-column: span clamp(1, w, cols)              /* w=列 span, 窄屏 clamp 到 cols */
  grid-row: span h                                 /* h=行 span */
}
```
- **同行等高废除**: 由 row-unit 整数倍 + span 决定高度 (calc), 高度统一对齐、无缝拼接 (满足 #150 原始 PRD 第4点)。
- **响应式**: cols 随断点变; widget w 超过当前 cols 时 clamp。layout 存逻辑 span (xl 基准 12 列), 渲染时按断点缩放。

## 3. 二维尺寸契约 (widget-types.ts)
```ts
// 枚举档 → 数值 span (完全自定义)
export interface WidgetSize { w: number; h: number }   // w: 1–12 列; h: ≥1 行 (row-unit 倍数)
export interface WidgetMeta {
  id; titleKey;
  defaultSize: WidgetSize          // 校准到 ≈ 现状高/宽
  minSize: WidgetSize              // resize 下限 (防内容挤坏)
  maxSize?: WidgetSize             // 可选上限
  defaultOrder; defaultHidden
}
export interface WidgetRenderProps {
  w: number; h: number             // 物理格子尺寸; widget 据此填充内容
  chartType?; onChartTypeChange?
}
```
> w/h 含义从「档枚举」变「网格 span 数值」。widths/heights 枚举数组删除。旧 `WidgetWidth='W1'|'W2'|'W4'` 删除 (列 span 12 网格下: W1≈3, W2≈6, W4≈12 作迁移映射, 见 §6)。

## 4. 交互
- **拖放排序**: dnd-kit 复用 (SortableContext + rectSortingStrategy 已有), 改 widget 顺序; dense 重新填布。
- **resize 手柄** (自研, 新): 编辑态卡片右/下/右下角手柄; pointerdown→move 累计 delta / (colWidth|row-unit) → 改 w/h span; clamp min/maxSize; pointerup 持久化。grid 即时反映新 span。
- **过渡**: framer-motion `layout` 接管 span 变化的 FLIP (复用现状); 拖拽态关 layout 用 dnd transform (复用现状, 防变形)。

## 5. widget 内容填充 (16 widget 接入)
widget 在格子内 `height:100%` 填满 (widget-shell children 区已 `flex-1 min-h-0`):
- **列表类** (recent-sessions/top-usage/model-distribution/model-efficiency/project-allocation): 按可用高度显示尽量多行 — 渲染 maxRows 数据 + `overflow` 截断 + 底部「查看更多」; 或 ResizeObserver 测高算行数 (实现时择简)。
- **图表类** (usage-trend/session-duration/cumulative-growth/model-trend/spend/token-breakdown): `ResponsiveContainer height="100%"` 填满格子; 根 div `h-full`。细节 (轴/网格/图例) 按格子尺寸阈值显隐。
- **固定类** (stats-band/quick-actions/activity-heatmap/activity-rhythm/activity-insights): 内容自然布局, minSize 锁定防缩坏; 仍可 resize 但内容不随高增减 (留白由用户负责, 完全自定义下可接受)。

## 6. 持久化 + 迁移 (dashboard-layout.ts)
```ts
WidgetLayoutItem = { id, w, h, hidden, chartType? }   // size{w,h} 扁平为 w,h 数值; order=数组序
DASHBOARD_LAYOUT_VERSION 2 → 3
```
迁移 (容旧, 不崩):
1. v2 `{size:{w:'W1'|'W2'|'W4'}}` → 列 span 映射 `W1→3, W2→6, W4→12` + h = meta.defaultSize.h。
2. v1 字符串 S/M/L/Wide/XL → 同上经 W 档再映射。
3. 缺失/损坏 → meta.defaultSize。clamp 到 [minSize, maxSize]。

## 7. 改动清单 (符号边界: dashboard 模块 + overview.tsx)
| # | 文件 | 改动 |
|---|---|---|
| 1 | widget-types.ts | WidgetSize{w:number,h:number} + min/maxSize; 删 WidgetWidth/widths/heights |
| 2 | widget-catalog.ts | 16 条改 defaultSize/minSize (数值 span, 校准现状) |
| 3 | widget-grid.ts | span→CSS 工具 (gridColumn/gridRow span); 删旧 widthColSpanClass |
| 4 | dashboard-layout.ts | WidgetLayoutItem{w,h} + 迁移映射 + version 3 |
| 5 | use-dashboard-layout.ts | setSize(id,w,h) 替代 setWidth; resize 调用 |
| 6 | dashboard-grid.tsx | CSS Grid 引擎重写 (cols 响应式 + auto-rows + dense) + resize 手柄 |
| 7 | widget-shell.tsx | resize 手柄 UI (编辑态) + 删宽度档 SegmentedTabs |
| 8 | overview.tsx | 透传 setSize |
| 9 | 16 widget | 接收 w,h 数值 + height:100% 填充 |
| 10 | use-resize-handle.ts (新) | resize 手柄 pointer 逻辑 hook |

## 8. 测试矩阵 (不变量 16)
| 变更/行为 | 类型 | 文件 | 命令 |
|---|---|---|---|
| catalog defaultSize/minSize 合法 (w∈1..12, h≥1, default≥min) | unit | tests/unit/widget-catalog.test.ts | pnpm test |
| layout 迁移 v2{W档}→span / v1 字符串 / clamp / version3 / defaultLayout | unit | tests/unit/dashboard-layout.test.ts | pnpm test |
| span→gridColumn/gridRow CSS 纯函数 + 窄屏 clamp | unit | tests/unit/widget-grid.test.ts | pnpm test |
| use-resize-handle: delta→span 量化 + clamp min/max | unit | tests/unit/use-resize-handle.test.ts | pnpm test |
| setSize 更新 + 持久化 | unit | tests/unit/use-dashboard-layout.test.ts | pnpm test |
| 引擎渲染 / 拖放 / resize / dense 填空 / 响应式 | 手动 CDP | verify | agent-dev CDP |

## 9. 验收标准 (覆盖 v1 AC)
- **AC1'** 12 列网格 + auto-rows + dense 渲染; widget 按 w/h span 占格, 紧凑无竖向空隙。
- **AC2'** 默认布局 span 校准到 ≈ 现状 (近似零回归, 非像素级); 老用户打开不突兀。
- **AC3'** resize 手柄: 编辑态拖拽即时改 w/h span, clamp min/max, 持久化刷新保留。
- **AC4'** 拖放排序复用 dnd-kit, 无变形 (CSS.Translate 丢 scale 复用)。
- **AC5'** widget 内容填满格子: 图表 height:100%, 列表按高度显示行数。
- **AC6'** 响应式: 窄屏 cols 缩减, span clamp, 布局不溢出。
- **AC7'** layout 迁移旧 {w 档} → span 不崩、近似现状。
- **AC8'** framer layout 过渡平滑 (span 变化 FLIP, resize 无跳变)。
- **AC9'** typecheck/lint/test 全绿 + 新单测通过。

## 10. 界面质量与交互验收
- **布局**: 12 列 dashboard 网格 (xl), 响应式降列; dense 紧凑填空; gap 24 维持。
- **resize 手柄**: 编辑态卡角/边出现 (hover 强化), 非编辑态隐藏; 拖拽有网格吸附反馈; 复用 berth 克制样式 (细线手柄, 非粗块)。
- **拖放**: 复用现状 DragOverlay 浮层 + 高亮; resize 与 drag 手柄区分 (drag=Move 图标头部, resize=角/边)。
- **状态/a11y**: 编辑态显手柄; resize 支持键盘 (方向键改 span, 可选); 空/加载/错误态 widget 自处理。
- **i18n**: resize 手柄 aria-label 补 key。
- **验收**: CDP 真跑 — 拖放 + resize + dense 填空 + 响应式断点 (不变量 22 逐组件×逐尺寸; 数据流类真跑时序)。

## 11. 分阶段
- **Level 1 (本轮)**: dense 流式紧凑 (顺序 + 数值 span + resize), 满足"任意拼接组合/丰富小组件/完全自定义尺寸"。
- **Level 2 (未来)**: 绝对 {x,y} 网格定位 + 碰撞 (任意位置)。本轮数据模型 {w,h} 向前兼容, Level 2 加 {x,y} 即可。记 docs/issues 作后续。
