# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 小步提交。implement 阶段维护此清单。
依赖序: 数据后端 → 框架 → widget → 健康弹窗 → 组装/自定义 → onboarding → 抛光/验证。
每个实现项必须有测试证据或明确例外理由。

## Phase A — 数据后端 (engine + IPC, 自底向上可独立测)

- [x] A1: `engine/activity-insights.ts` 聚合纯函数 (buildActivityHeatmap/buildStreakStats/buildPeakMetrics/buildTopUsage/buildActivityInsights/buildDashboardInsights) + `DashboardInsights` 类型 — done: shared/types/insights.ts + 12 单测全过, typecheck/lint clean
  - tests: `tests/unit/activity-insights.test.ts` — heatmap 本地日分桶、streak 跨空档/单日、peak max、topUsage 计数+排序+并列、insights 计数; fixtures 构造 session Asset[]
  - verify: 不适用 (纯逻辑)
- [ ] A2: 新 IPC `insights:dashboard` 四方对账 (ipc.ts IpcChannels+类型 / handlers registerInsightsHandlers / preload window.api.insights.dashboard / tests/setup.ts mock) + `runtime.getDashboardInsights` selector-cache
  - tests: 既有 `ipc-contract.test.ts` / `ipc-registration.test.ts` 自动覆盖四方一致; runtime 取值 unit (可选)
  - verify: 不适用

## Phase B — Widget 框架

- [ ] B1: 安装 `@dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10 @dnd-kit/utilities@^3` (devDependencies) + React19 smoke spike (最小 sortable 渲染+拖拽不报错)
  - tests: 安装后 `pnpm typecheck` + dev 启动无 findDOMNode/peer 报错 (spike 实证)
  - verify: spike 截图/控制台无错
- [ ] B2: `widget-types.ts` 契约 + `widget-registry.ts` (WidgetId/WidgetDefinition 注册表) + `lib/dashboard-layout.ts` 纯函数 (parse/migrate/serialize/reset)
  - tests: `tests/unit/widget-registry.test.ts` (每 def 必填+合法 size); `tests/unit/dashboard-layout.test.ts` (migrate 丢未知+追加新 / corrupt→default / 序保持)
  - verify: 不适用
- [ ] B3: `widget-shell.tsx` (无边框语义容器 + hover/edit affordance) + `dashboard-grid.tsx` (CSS Grid 尺寸跨度 + DndContext/SortableContext rectSortingStrategy 重排) + `use-dashboard-layout.ts` (localStorage 读写 + reorder/resize/toggle)
  - tests: dashboard-layout 已 B2 覆盖; shell/grid 行为属交互 → 运行实测
  - verify: 编辑态 affordance 显隐、拖拽重排、尺寸循环、键盘排序 (CDP/实机) [AC4]

## Phase C — Widget 实现 (各自独立数据 hook + memo)

- [ ] C1: 移植现有 → widget: `quick-actions` (现 metrics 卡) / `recent-sessions` (现 panel) / `usage-trend` (泛化现 7d 图, 复用 Recharts + chart-colors)
  - tests: 移植不改数据契约, 既有数据 hook 测试不回归; 渲染 smoke
  - verify: 三 widget 在 grid 内正确渲染 + loading/empty/error 态 [AC2]
- [ ] C2: 新数据 widget (上半): `stats-band` (累计/峰值token/最长时长/streak/会话数, tabular-nums) + `activity-heatmap` (年度方格 + 每日/周/累计切换, 单色相 ramp)
  - tests: 消费 A1/A2 数据; 取数 hook (SWR) smoke; 热力图分桶映射可加 unit
  - verify: 热力图色阶/对齐/切换、指标带数字格式 — 截图裁定 [AC3][AC9]
- [ ] C3: 新数据 widget (下半): `activity-insights` (M) + `top-usage` (skill/mcp/subagent 切换排行) + `token-breakdown` (input/output/cache/reasoning) + `model-distribution`
  - tests: 取数 hook smoke; top-usage 数据来自 A1
  - verify: 排行/构成/分布渲染 + 空态 [AC3]
  - 注: plugin 用量若源数据不可得 → top-usage 不含 plugin, 记 docs/issues 跟踪 (交叉引用)

## Phase D — 健康检查弹窗 [AC1]

- [ ] D1: `health/health-modal.tsx` (HeroUI Modal+useDisclosure, 复用 useHealthChecks + 现 HealthCheckRow/分组/导航/fix snippet/info 忽略) + `health/health-entry.tsx` (toolbar 入口: worst severity+count) + 从 overview 删平铺 `HealthWorklistPanel` 及其在 grid 的位置
  - tests: `tests/unit/health-modal.test.tsx` (open/close/Esc/列表渲染); 删除同批清理孤儿 (ARCHITECTURE 删除纪律)
  - verify: 入口点击开弹窗、focus-trap、Esc、导航/复制可用、首页不再平铺 [AC1]

## Phase E — 组装 + 自定义

- [ ] E1: `dashboard-toolbar.tsx` (标题+scope+health-entry+自定义切换) + `widget-library.tsx` (编辑态添加隐藏 widget + 重置默认) + `overview.tsx` 瘦身为 host (toolbar + grid)
  - tests: 布局 action 经 B2 纯函数覆盖; 组装属集成 → 运行实测
  - verify: 默认视图无 chrome、进编辑态全 affordance、添加/隐藏/重置、**重载后布局保留** (CDP) [AC4][AC2]

## Phase F — Onboarding + i18n + 抛光/性能

- [ ] F1: onboarding/空数据态 (默认布局 + 引导空态) + en/zh i18n key 全覆盖 + 大数/时长/日期 formatter (lib + unit)
  - tests: formatter unit `tests/unit/format-*.test.ts`; i18n key 存在性
  - verify: 清空/少数据下引导态 [AC8]
- [ ] F2: staggered 入场 (framer-motion, 首挂载 + reduced-motion 关) + 性能 pass (widget memo / 防抖写入 / 重排不重算)
  - tests: reduced-motion 分支可加 unit; 帧率属运行
  - verify: CDP 实测拖拽帧率 + 多 widget 同屏 + 数据不阻塞 UI [AC6][不变量 22]

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
