# 需求分析 (Explore 产物 — GH-150 总览拖拽体验大修)

## 现状理解 (模块/进程/契约)

纯 **renderer 层闭环**, 不碰 main / IPC / 引擎 / 数据层。拖拽链路与布局全在 dashboard 模块内:

- **拖拽栈**: `DndContext`(`closestCenter` 碰撞 · `PointerSensor{distance:4}` · `KeyboardSensor`) → `SortableContext`(`rectSortingStrategy`) → `SortableWidget`(`useSortable` + `CSS.Transform.toString(transform)`) → `WidgetShell`(grip 按钮持 `dragHandleProps`)。`dashboard-grid.tsx`。
- **布局**: CSS Grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 md:grid-flow-row-dense`, `gridAutoRows:1px`, 每 widget `gridRowEnd: span N`(N = `offsetHeight + 28`, `use-masonry-rows.ts` 经 ResizeObserver 实时测)。
- **尺寸契约**: 5 档 `WidgetSize = S|M|L|Wide|XL` → `SIZE_CLASS` col-span 1/2/4(响应式)。**宽度已档位化, 高度是连续 masonry 值**。
- **状态/持久化**: `useDashboardLayout` → localStorage 单 key `DASHBOARD_LAYOUT_STORAGE_KEY`; `reorder` = `arrayMove`(全量 widgets, 含 hidden); `show/hide` 切 `hidden`; 无 scope/agent 维度。
- **数据**: `DashboardInsightsProvider` 单次取 `insights:dashboard` 供多 widget 共享; 各 widget 经 `useInsights`/`use-ipc` hooks 取数。**拖拽期 context value 稳定**(agentView/projectPath 不变), 故数据不是重渲染抖动源。

### 四项根因 (已用源码/代码坐实)

**R1 · 拖拽内容变形 (置信度: 高, 源码+截图双证)**
`@dnd-kit/sortable` v10 `rectSortingStrategy`(`node_modules/@dnd-kit/sortable/dist/sortable.esm.js:160-165`)返回 `{ x, y, scaleX: newRect.width/oldRect.width, scaleY: newRect.height/oldRect.height }`; `dashboard-grid.tsx:126` 用 `CSS.Transform.toString(transform)` 把 scale **一并渲染**。active 与目标槽位尺寸不同 → `scale≠1` → 卡片缩放, 内容拉伸; 同尺寸 scale=1 不变形(解释"有时有有时无")。截图字母横向拉伸 = `scaleX>1` 签名。止血 = `CSS.Transform.toString`→`CSS.Translate.toString`(丢 scale, 对 active 与让位兄弟全生效, 零功能风险); 根治 = 档位化使同档等尺寸恒 scale=1。

**R2 · 拖拽掉帧 (根因链已定位; 主导项待 profile 实证)**
16 widget 无一 `React.memo`(grep 0 命中) + 5 个 recharts(`ResponsiveContainer`+SVG)。dnd-kit 每次 `over` 变化 → SortableContext 全树重渲染 → recharts 每帧重算 SVG → 掉帧。加剧: `dashboard-grid.tsx:148-155` 回调内联破坏 memo + 16 个 per-widget `ResizeObserver`。解: ①`DragOverlay` 解耦(拖拽期底层静止, 0 图表重渲染) ②`React.memo`+`useCallback` ③档位化去 ResizeObserver。**主导瓶颈是假设, verify 必须真跑 profile 实测**(memory runtime-behavior-needs-real-run)。

**R3 · 新增 widget 无聚焦 (置信度: 高)**
`use-dashboard-layout.ts:93` `show()` 仅置 `hidden=false` 追加末尾, 无 scrollIntoView/高亮 → 新增落底部视口不动。解: `show` 后 `scrollIntoView({behavior:'smooth',block:'center'})` + 短暂高亮(motion-safe)。

**R4 · 连续高度致空隙不可预测 (置信度: 高)**
高度 `offsetHeight+28` 连续值 + `grid-flow-row-dense` 非线性回填 = 拖拽预览失真同源 + 竖向空隙源。解: 高度改固定行单元整数倍 uniform grid, 超档内容 = 截断 + 查看更多。

## 关联与依赖 (blast radius, 符号边界非子串)

- **闭环**: 仅 `pages/overview.tsx` + `components/dashboard/{dashboard-grid,widget-shell,use-masonry-rows,use-dashboard-layout,widget-registry,widget-catalog,widget-types}` + `lib/dashboard-layout.ts` import 受影响符号, **无外部页面/组件消费 → scope=module 坐实, 不外溢**。
- **契约扩散点**: 给高度档扩展 `WidgetSize`/新增高度维度会触及 `widget-catalog`(16 条全表)+ `widget-types`(union)+ 16 个 `*.widget.tsx`(各自适配)。单 Agent 串行推进, 无并发撞车。
- **不碰**: main/preload/IPC/引擎/其他页面/数据 hooks 契约。`docs/ARCHITECTURE.md` 未单列 dashboard(archive 时宜补布局模型一条)。

### widget 高度光谱 (档位设计依据)

| 类型 | 代表 | 高度特征 | 档位化要点 |
|---|---|---|---|
| 横条 | stats-band | 极矮固定 (~90px), Wide/XL | 矮档; 内容固定无截断 |
| 图表 | cumulative-growth / usage-trend / model-* | chartHeight **已离散** (120/152/184)+header | 易映射档高 |
| 列表 | recent-sessions | 内容驱动, S/M/L=3/5/8 条 | **截断+查看更多主战场**, 超档跳 /sessions |
| 网格 | activity-heatmap | 日历热力, Wide/XL | 中高固定档 |

图表类高度已离散(档位化近零成本), 列表类是真连续高度源(需配截断)。

## 任务分类与 debt 校准
- type / maintenance.subtype: **feature** / 不适用(新增可见行为: 档位布局/聚焦/截断查看更多)。
- source.kind / refs: **user-request** / [] (Issue #150)。
- debt estimate 修正: 影响面与初估一致 (incurred 5 / repaid 2 / net 3), 不改数值。
- scope / risk / areas / confidence: module / medium / [ui-ux, performance] / **low→medium**(根因坐实 + blast radius 闭环)。
- revision: 已追加 1 条 (explore: confidence low→medium, scope=module 坐实)。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. **AC-1** 拖拽过程任意尺寸 widget 互换均**不缩放变形**(active 与让位兄弟皆然)。
2. **AC-2** 拖拽流畅: verify 真跑 Chrome DevTools profile, 拖拽期主线程**无 >50ms 长帧 / 帧率达标**(阈值 design 定), 对比优化前。
3. **AC-3** 新增 widget 后**自动滚动到该 widget + 短暂视觉聚焦**; 视口原本不含该位置时也成立。
4. **AC-4** 布局**固定档位整数倍**, 同档等尺寸, 无竖向空隙。
5. **AC-5** 内容超档时**截断 + "查看更多"入口**, 入口可达对应详情。
6. **AC-6** 拖拽重排**正确持久化**(localStorage 往返), reorder 语义不回归。
7. **AC-7** 键盘拖拽(KeyboardSensor)与 focus 可达性**不退化**。
8. **AC-8** 每 widget × 每尺寸档 × 各状态(loading/empty/error/正常)**逐项 CDP 视觉验收**(不变量 22, 不接受单张整页截图)。
9. **AC-9** 门禁全绿(typecheck/lint/test)且**无外部 blast**。

## 界面质量与交互验收
- **设计系统**: `WidgetShell` 无边框安静容器, affordance 悬停/编辑态才显, 编辑态外扩虚线环, 拖拽态实心抬起面+shadow-xl+ring; 尺寸切换 `SegmentedTabs` 枚举式。契合用户 quiet/refined taste (memory: 拒灰板/卡片框/大蓝)。
- **信息密度**: 密集信息面, 内容驱动密度。档位化后密度由档高决定, 须保各档"肉眼可分"(不变量 22)。
- **状态**: loading=animate-pulse skeleton; empty=`EmptyState`/文案; error 多数 widget 未单列(loading/empty 兜底)→ 档位化后空/截断态需重核。
- **响应式**: md(2 列)/xl(4 列); 档位化需定义各断点 col×row 档换算。
- **a11y**: grip 有 `aria-label .../drag to reorder`+focus ring; KeyboardSensor 在 masonry/dense 下坐标不可靠(R1/R4 同源), 规则网格后才可靠。

## 未决问题
留给 design 向人澄清 (部分需用户 checkpoint)。
1. **档位参数**(核心 checkpoint): 基础行高单元(px)? 每 widget 几档高度? 宽度档保留 5 档还是简化? md/xl 断点下 col×row 档换算?
2. **DragOverlay 底层渲染**: 原位静态骨架 vs 半透明占位? 档位规则网格后是否还需 `grid-flow-row-dense`?
3. **截断策略**: 各可超档 widget 的截断阈值与"查看更多"目标路由(recent-sessions→/sessions; 其它?)。
4. **性能量化目标**: AC-2 帧率/长帧阈值具体值。
5. **外部 SDK 查证**(不变量 9, design 必做): `DragOverlay` 官方用法 + `dropAnimation` + 与 `SortableContext` 协作最佳实践, 先查 dnd-kit 官方文档再定方案。
