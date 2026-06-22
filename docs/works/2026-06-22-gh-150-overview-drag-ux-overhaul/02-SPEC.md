# 技术方案 (Design 产物 — GH-150 总览拖拽体验大修)

每条回指 01-ANALYSIS 验收标准编号 (AC-1..AC-9)。

## 已定决策 (用户 checkpoint, 写入约束)
- 整体一个大件一次性重构 (不单独先发止血)。
- 超档内容 = **截断 + 查看更多**。
- 档位粒度 = **宽 3 档 × 高 2 档 (极简)**: 宽 `W1/W2/W4`=1/2/4 列; 高 `short/tall`=220/440px (1:2 整数倍)。
- 官方背书: dnd-kit sortable grid 官方示例即用 `gridAutoRows` 固定行高 + `gridAutoFlow:dense` (非连续 masonry); DragOverlay classic 模式来自 `@dnd-kit/core` (onDragStart 记 activeId + 浮层渲染克隆)。

## 数据契约

### WidgetSize 二维化 (widget-types.ts)
```ts
type WidgetWidth = 'W1' | 'W2' | 'W4'      // 1 / 2 / 4 列
type WidgetHeight = 'short' | 'tall'        // 220 / 440 px
interface WidgetSize { w: WidgetWidth; h: WidgetHeight }
```
`WidgetMeta` 改: `defaultSize: WidgetSize` + `widths: WidgetWidth[]` + `heights: WidgetHeight[]` (取代旧 `sizes: WidgetSize[]`; 宽/高独立可切, 笛卡尔积 = 允许组合)。`WidgetRenderProps` 改: 传 `w: WidgetWidth` + `h: WidgetHeight` 原始值 (非 object, 利于下游 React.memo 命中), 删旧 `size`。

### 布局常量 (新 lib/widget-grid.ts, 纯函数直测)
```ts
ROW_UNIT = 220            // px, gridAutoRows
ROW_GAP  = 24             // px, gap-y
// short → span 1 (220); tall → span 2 (440 + 1 ROW_GAP = 464)
// 2×short (220+24+220=464) == 1×tall → dense 填空整数倍无空隙
widthColSpanClass(w): string   // W1→col-span-1; W2→col-span-1 md:col-span-2 xl:col-span-2; W4→col-span-1 md:col-span-2 xl:col-span-4
heightRowSpan(h): number       // short→1; tall→2
listCapacity(h): number        // 列表类可显条数: short→N_s, tall→N_t (按 ROW_UNIT/行高算, 实现时定值)
```

### widget → 档位默认映射 (catalog; 实现后截图微调)
| widget | default | widths | heights |
|---|---|---|---|
| stats-band | W4×short | [W4] | [short] |
| activity-heatmap | W4×short | [W2,W4] | [short,tall] |
| activity-insights | W2×short | [W1,W2] | [short,tall] |
| top-usage | W2×short | [W1,W2] | [short,tall] |
| recent-sessions | W2×tall | [W1,W2] | [short,tall] |
| usage-trend | W2×short | [W2,W4] | [short,tall] |
| quick-actions | W2×short | [W1,W2,W4] | [short] |
| token-breakdown | W2×short | [W1,W2] | [short,tall] |
| model-distribution | W2×short | [W1,W2] | [short,tall] |
| activity-rhythm | W2×short | [W2,W4] | [short,tall] |
| session-duration | W2×short | [W2] | [short,tall] |
| cumulative-growth | W2×short | [W2,W4] | [short,tall] |
| model-efficiency | W2×short | [W2] | [short,tall] |
| project-allocation | W2×short | [W1,W2] | [short,tall] |
| model-trend | W2×short | [W2,W4] | [short,tall] |
| spend | W1×short | [W1,W2] | [short] |

### 旧 layout 迁移 (lib/dashboard-layout.ts)
parseLayout 把旧单维 size 字符串迁移: `S→{W1,short} · M→{W2,short} · L→{W2,tall} · Wide→{W4,short} · XL→{W4,tall}`。缺字段/非法档 → 该 widget 用 catalog `defaultSize`; 整体解析失败 → `defaultLayout()`。serializeLayout 写新 `{w,h}`。

## 模块结构 / 组件拆分 (遵守 ARCHITECTURE 规则 6: 表现焊死组件内, 禁 className 逃生舱; >50 行纯逻辑下沉 lib 直测)

| 文件 | 改动 |
|---|---|
| `widget-types.ts` | WidgetSize 二维; WidgetMeta widths/heights; WidgetRenderProps w/h |
| `widget-catalog.ts` | 16 widget 改 defaultSize{w,h}+widths+heights (上表) |
| **新** `lib/widget-grid.ts` | ROW_UNIT/ROW_GAP/widthColSpanClass/heightRowSpan/listCapacity 纯函数 |
| `lib/dashboard-layout.ts` | 序列化/解析 + 旧 size 迁移 + defaultLayout 用新档 |
| `dashboard-grid.tsx` | **DragOverlay**(activeId state)+ `closestCenter→closestCorners` + `CSS.Transform→CSS.Translate`(丢 scale) + 固定 `gridAutoRows:220`+span + 删 masonry + `React.memo(SortableWidget)` + isDragging 占位 |
| `widget-shell.tsx` | 尺寸切换 UI 二维 (宽档/高档各一 SegmentedTabs, 单档时不显) + 拖拽态占位样式 |
| `use-dashboard-layout.ts` | `lastAddedId` state; show 时 set (聚焦钩子) |
| **删** `use-masonry-rows.ts` | 不再连续测量 (去 16 个 ResizeObserver) |
| `widgets/*.widget.tsx ×16` | size 判断从单维改 w/h; 列表类 (recent-sessions/top-usage/project-allocation) 加截断+查看更多; `React.memo` 包裹 |
| `overview.tsx` | 传 lastAddedId 给 grid |

### DragOverlay 拖拽栈 (dashboard-grid.tsx)
```
const [activeId,setActiveId]=useState<WidgetId|null>(null)
<DndContext sensors collisionDetection={closestCorners}
  onDragStart=({active})=>setActiveId(active.id)
  onDragEnd=(e)=>{reorder(e); setActiveId(null)} onDragCancel=()=>setActiveId(null)>
  <SortableContext items={ids} strategy={rectSortingStrategy}>
    <div className="grid ... md:grid-flow-row-dense" style={{gridAutoRows:'220px'}}>
      {rendered.map(SortableWidget)}   // useSortable transform→CSS.Translate; isDragging→opacity-40 占位(不渲染图表)
    </div>
  </SortableContext>
  <DragOverlay dropAnimation={{duration:180,easing:'ease-out'}}>
    {activeId ? <WidgetOverlayClone item={activeItem}/> : null}   // 固定 W×H 像素尺寸, 不受 strategy scale → 不变形
  </DragOverlay>
</DndContext>
```
- **R1 根治**: ① CSS.Translate 丢 scale (active+让位兄弟皆不缩放); ② DragOverlay clone 固定档位像素尺寸; ③ 同档等尺寸 strategy 恒 scale=1。三重保险。
- **R2 性能**: 拖拽期底层 SortableWidget isDragging 占位 (不渲染 recharts) + 其余 widget React.memo 挡重渲染 → 仅 1 个 overlay clone 渲染 (静止, 不随 over 重渲染)。closestCorners 改善异构尺寸定位。
- 回调稳定: SortableWidget 内 `useCallback((s)=>onSetWidth(item.id,s),[onSetWidth,item.id])` 等, 替代当前 map 内联 (dashboard-grid.tsx:148-155)。

### 新增聚焦 (R3)
`useDashboardLayout` 暴露 `lastAddedId`; `show(id)` set 之。grid 内匹配 `item.id===lastAddedId` 的 SortableWidget 在 mount effect 里 `scrollIntoView({behavior:'smooth',block:'center'})` + 临时高亮 (motion-safe ring, ~1.5s 后清), 用后清 lastAddedId 防重复。

### 截断 + 查看更多 (R4 / 超档)
列表类 (recent-sessions/top-usage/project-allocation): 按 `listCapacity(h)` 算可显条数, 超出截断 + 底部 "查看更多 (N) →" link (recent-sessions→`/sessions`; 其它→对应一级页)。图表类高度跟档 (chartHeight 由 h 决定), 无截断。容器 `overflow-hidden` 防溢出档高。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 固定 220/440 双档 + dense 填空; 各档保肉眼可分 (short 紧凑/tall 展开) | CDP 逐档截图, M/L 等价档可分 |
| 组件选择 / 设计系统一致性 | 沿用 WidgetShell 无框安静容器 + SegmentedTabs; 二维尺寸切换两个小 SegmentedTabs | 截图核对 quiet taste (拒灰板/卡框/大蓝) |
| 交互反馈 / 状态切换 | 拖拽 DragOverlay 抬起 (实心面+shadow+ring) + 原位 opacity 占位; drop 180ms 动画; 新增高亮 ring | CDP 真跑拖拽 + 新增, 观察动态 |
| loading / empty / error / disabled / focus | 沿用 skeleton/EmptyState; 截断态新增 "查看更多"; grip focus-visible ring | 逐 widget 逐状态截图 |
| 响应式 / 可访问性 / 键盘可达 | W 档 md/xl 降级 (W4→2列@md); 固定档网格使 KeyboardSensor 坐标可靠 | md/xl 截图 + 键盘拖拽实测 |
| 文案 / i18n / 数字和路径格式 | "查看更多" + 尺寸档 label 补 i18n key (en/zh) | i18n key 无死键 |

## 测试策略

| 变更/行为 | 类型 | 测试文件 | 命令 | AC |
|---|---|---|---|---|
| 档位→col/row span 映射 | unit | **新** tests/unit/widget-grid.test.ts | pnpm test | AC-4 |
| 旧 size→{w,h} 迁移 + 往返 | unit | tests/unit/dashboard-layout.test.ts (扩展) | pnpm test | AC-6 |
| catalog 二维档合法 (default∈widths×heights) | unit | tests/unit/widget-catalog.test.ts (扩展) | pnpm test | AC-4 |
| 列表 listCapacity + 截断 | unit | **新** tests/unit/widget-grid.test.ts | pnpm test | AC-5 |
| 拖拽 transform 无 scale (CSS.Translate) | renderer | tests/renderer/overview-dashboard.test.tsx (扩展) | pnpm test | AC-1 |
| DragOverlay clone + 原位占位 | renderer | overview-dashboard.test.tsx (扩展) | pnpm test | AC-1,AC-2 |
| 新增 widget scrollIntoView 调用 | renderer | overview-dashboard.test.tsx (扩展, mock scrollIntoView) | pnpm test | AC-3 |
| reorder 持久化往返 | unit | dashboard-layout.test.ts | pnpm test | AC-6 |
| 键盘拖拽不退化 | renderer | overview-dashboard.test.tsx | pnpm test | AC-7 |
| 拖拽帧率 (真跑 profile) | manual/CDP | verify 阶段 | — | AC-2 |
| 各 widget×各档×状态 视觉 | manual/CDP | verify 阶段逐项 | — | AC-8 |
| 门禁 | harness | pnpm typecheck/lint/test | — | AC-9 |

不写自动化的项: AC-2 帧率 (须真跑 Chrome DevTools profile 实测, 单测无法度量渲染性能) · AC-8 视觉 taste (主观, 用户最终裁判, verify 截图确认)。

## 任务分类与 debt
- type / subtype: feature / 不适用。
- source.kind / refs: user-request / Issue #150。
- debt.estimate: design 后影响面比初估略大 (WidgetSize 契约二维化波及 16 widget + 持久化迁移)。**incurred 5→7, repaid 2→3 (删 16 ResizeObserver + 修变形 + memo 偿还旧 ui-ux 债), net 3→4**。
- revisions: 追加 design 一条 (incurred/repaid/net 上调)。
- Project 字段同步: archive 时 `harness-projects done` 同步 final debt。
- 总 debt pool=17 (ok, <40), 无 override 需求。

## 验收标准映射
| SPEC 项 | AC |
|---|---|
| CSS.Translate + DragOverlay clone + 同档等尺寸 | AC-1 |
| DragOverlay 解耦 + memo + 占位 + closestCorners + 真跑 profile | AC-2 |
| lastAddedId + scrollIntoView + 高亮 | AC-3 |
| 固定 220/440 档 + span + dense + 删 masonry | AC-4 |
| listCapacity 截断 + 查看更多 | AC-5 |
| reorder 持久化 + 旧 layout 迁移 | AC-6 |
| 固定档网格 KeyboardSensor 可靠 | AC-7 |
| 逐 widget×档×状态 CDP 截图 | AC-8 |
| 门禁全绿 + blast radius 闭环 | AC-9 |
