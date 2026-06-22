# 任务清单 (Design 产物 / 活清单 — GH-150)

从 02-SPEC 拆解。每任务 = 可独立验证 + 可独立提交的增量 (COMMIT_POLICY 小步提交)。
顺序: P1→P2→P3 (契约链) → P4 (布局) → P5→P6 (拖拽, 同文件顺序) → P7→P8 (widget) → P9 → P10 → P11。
并行边界: P7(widgets/*) 与 P9(widget-shell) 文件不重叠理论可并行, 但单 Agent 串行推进; P5/P6 同改 dashboard-grid 必须顺序。

- [x] **P1 契约 + 布局纯函数**: widget-types 二维 `WidgetSize{w,h}` + `WidgetMeta{widths,heights}` + `WidgetRenderProps{w,h}`; 新 `lib/widget-grid.ts` (ROW_UNIT/ROW_GAP/widthColSpanClass/heightRowSpan/listCapacity)。
  - tests: 新 tests/unit/widget-grid.test.ts (span 映射 + listCapacity 边界)
  - verify: 单测绿 + typecheck; 不适用 UI
- [x] **P2 catalog 二维映射**: 16 widget 改 `defaultSize{w,h}`+`widths`+`heights` (02-SPEC 映射表)。
  - tests: tests/unit/widget-catalog.test.ts 扩展 (每 widget defaultSize ∈ widths×heights; 档值合法)
  - verify: 单测绿; 不适用 UI
- [x] **P3 持久化迁移**: dashboard-layout serialize/parse 写新 `{w,h}` + 旧 size(S/M/L/Wide/XL)→{w,h} 迁移 + defaultLayout 用新档。
  - tests: tests/unit/dashboard-layout.test.ts 扩展 (旧→新迁移; 非法 fallback default; 往返幂等)
  - verify: 单测绿; 旧 localStorage layout 加载不崩 (手动塞旧值)
- [x] **P4 固定档布局**: dashboard-grid 用 `gridAutoRows:220`+`heightRowSpan`(grid-row span)+`widthColSpanClass`+保留 dense; **删 use-masonry-rows.ts** 及其引用。先不动拖拽逻辑。
  - tests: renderer 断言 widget 容器 col-span/row-span class 随 w/h 正确
  - verify: CDP 截图各档静态布局**无竖向空隙** (AC-4); 删 masonry 后 typecheck 无悬挂引用
- [x] **P5 DragOverlay + 变形修复**: activeId state + onDragStart/End/Cancel; `DragOverlay` 渲染 active clone (固定 W×H 像素); `CSS.Transform→CSS.Translate` (丢 scale); `closestCenter→closestCorners`; isDragging 原位 opacity-40 占位 (不渲染图表)。
  - tests: overview-dashboard.test.tsx 扩展 (拖拽 style 无 scale; DragOverlay 渲染 active; 原位占位)
  - verify: CDP 真跑拖拽**任意尺寸互换不变形** (AC-1); reorder 仍正确持久化 (AC-6)
- [x] **P6 性能 memo**: `React.memo(SortableWidget)` + 各 widget `React.memo`; SortableWidget 内 `useCallback` 绑 item.id 替代 map 内联回调。
  - tests: 不适用自动化 (memo 命中难度量, 标注例外) — 行为正确性由 P5 测试覆盖
  - verify: verify 阶段真跑 Chrome DevTools profile 实测拖拽帧率, 对比优化前 (AC-2)
- [x] **P7 widget 档位适配**: 16 widget 内 `size==='L'/'Wide'` 等单维判断改 w/h (密度按 h: short/tall)。
  - tests: 抽样列表/图表 widget renderer 测试 (h 切换内容密度变化)
  - verify: 逐 widget × 档 CDP 截图, 各档肉眼可分 (AC-8)
- [x] **P8 截断 + 查看更多**: 列表类 (recent-sessions/top-usage/project-allocation) 按 `listCapacity(h)` 截断 + 底部 "查看更多 (N) →" link (→ /sessions 等); 容器 overflow-hidden。
  - tests: widget-grid listCapacity 单测 + renderer 断言截断 + link 存在
  - verify: CDP 超档截断 + link 路由正确 (AC-5)
- [x] **P9 尺寸切换 UI + 占位样式**: widget-shell 二维尺寸切换 (宽档/高档各一 SegmentedTabs, 单档不显) + 拖拽态占位样式; "查看更多"/档 label 补 i18n (en/zh)。
  - tests: widget-shell renderer 测试 (切宽/高档回调; 单档不渲染该维)
  - verify: 编辑态切宽/高档截图; i18n 无死键 (pnpm 相关校验)
- [x] **P10 新增聚焦**: use-dashboard-layout `lastAddedId` + show 时 set; grid 匹配项 mount effect `scrollIntoView({block:'center'})` + 临时高亮 ring (motion-safe, ~1.5s 清); overview 串接。
  - tests: overview-dashboard.test.tsx 扩展 (mock scrollIntoView, show 后断言被调 + 高亮 class)
  - verify: CDP 真跑从库新增 widget → 自动滚动到位 + 高亮 (AC-3)
- [ ] **P11 收口验证**: 全局 pnpm typecheck/lint/test + harness:check; 真跑 profile 帧率对比; 逐 widget × 档 × 状态 (loading/empty/error/正常) CDP 截图; 键盘拖拽实测; 截图请用户确认 taste。
  - tests: 全量 pnpm test 绿
  - verify: AC-1..AC-9 逐条核对 (AC-2 帧率实测 / AC-8 视觉 / AC-7 键盘); 用户截图确认

## 实现偏差 (与 SPEC/PLAN 的偏离, implement 就地记录)
- **P6**: memo 在 `widget-registry` 集中包裹各 widget (非 SortableWidget) — SortableWidget 持 `dragHandleProps` (每拖拽帧由 useSortable 新建) 无法稳定 memo; 改为 memo 各 widget + WidgetCard `useCallback` 稳定 Component 的 w/h/chartType/onChartTypeChange, 同样达成"图表不随 dnd over 重渲染"。
- **P8**: "查看更多"入口仅 recent-sessions (有 `/sessions` 详情页); top-usage / project-allocation 是 Top-N 聚合 (slice + "其他"段), 档位 limit 截断即设计本意, 无独立"全部"页, 不加入口。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
