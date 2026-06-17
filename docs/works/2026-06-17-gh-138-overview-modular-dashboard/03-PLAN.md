# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 小步提交。implement 阶段维护此清单。
依赖序: 数据后端 → 框架 → widget → 健康弹窗 → 组装/自定义 → onboarding → 抛光/验证。
每个实现项必须有测试证据或明确例外理由。

## Phase A — 数据后端 (engine + IPC, 自底向上可独立测)

- [x] A1: `engine/activity-insights.ts` 聚合纯函数 (buildActivityHeatmap/buildStreakStats/buildPeakMetrics/buildTopUsage/buildActivityInsights/buildDashboardInsights) + `DashboardInsights` 类型 — done: shared/types/insights.ts + 12 单测全过, typecheck/lint clean
  - tests: `tests/unit/activity-insights.test.ts` — heatmap 本地日分桶、streak 跨空档/单日、peak max、topUsage 计数+排序+并列、insights 计数; fixtures 构造 session Asset[]
  - verify: 不适用 (纯逻辑)
- [x] A2: 新 IPC `insights:dashboard` 四方对账 (ipc.ts IpcChannels+类型 / handlers / preload window.api.insights.dashboard / tests/setup.ts mock) + `runtime.getDashboardInsights` selector-cache — done: ipc-contract/registration 测试全过, typecheck/lint clean
  - tests: 既有 `ipc-contract.test.ts` / `ipc-registration.test.ts` 自动覆盖四方一致; runtime 取值 unit (可选)
  - verify: 不适用

## Phase B — Widget 框架

- [x] B1: 安装 `@dnd-kit/core@6.3.1 @dnd-kit/sortable@10 @dnd-kit/utilities@3` (devDependencies) + React19 smoke spike — done: tests/renderer/dnd-kit-smoke.test.tsx 挂载通过 (aria-roledescription=sortable, ref-based 无 findDOMNode), typecheck/lint clean。注: renderer 渲染测试须放 `tests/renderer/` (jsdom env), 纯逻辑放 `tests/unit/` (node env); 后续 health-modal/widget 组件测试同此约定。
- [x] B2: `widget-types.ts` 契约 + `widget-catalog.ts` (元数据单一真源, 与渲染解耦) + `lib/dashboard-layout.ts` 纯函数 (default/migrate/parse/serialize/reset) — done。registry (icon/component 绑定) 推迟到 C 各 widget 落地时填充。
  - tests: `tests/unit/widget-catalog.test.ts` (5: id 自洽/sizes 合法/defaultSize∈sizes/titleKey/order 唯一) + `tests/unit/dashboard-layout.test.ts` (9: migrate 丢未知+追加新+钳尺寸+去重+保序 / parse corrupt→default / round-trip) — 14 全过, typecheck/lint clean
  - verify: 不适用 (纯逻辑)
- [x] B3: `widget-shell.tsx` (无边框语义容器 + hover/edit affordance) + `dashboard-grid.tsx` (CSS Grid 尺寸跨度 + DndContext/SortableContext rectSortingStrategy 重排) + `use-dashboard-layout.ts` (localStorage 读写 + reorder/cycleSize/hide/show/reset) — done
  - tests: dashboard-layout 已 B2 覆盖; overview-dashboard 测编辑态 affordance/drag handle 出现
  - verify: 编辑态 affordance 显隐 ✓; 拖拽重排/键盘排序待 CDP 实测 [AC4]

## Phase C — Widget 实现 (各自独立数据 hook + memo)

- [x] C1: 移植现有 → widget: `quick-actions` / `recent-sessions` / `usage-trend` (单色 CHART_SERIES_FILL, theme-palette 测试重指向至此) — done, 去卡片框
  - tests: sessions-pages/theme-palette 重指向新结构后绿; 全套件 1194 无回归
  - verify: 截图已确认 (quick-actions 出数, recent-sessions 真实会话, usage-trend 7d 图)
- [x] C2: 新数据 widget (上半): `stats-band` (累计/峰值/最长时长/streak, tabular) + `activity-heatmap` (年度方格, 单色相 berth 强调色 ramp) — done; 用户截图确认 taste + 配色保持单色相
  - tests: 消费 A1/A2 经 insights-context; 截图实测填充正确
  - verify: 截图已裁定 (18.66B/1.40B/1793h/streak; 949 sessions 热力图)
- [x] C3: 新数据 widget (下半): `activity-insights` + `top-usage` (skill/mcp 切换排行) + `token-breakdown` (input/output/cache/reasoning 堆叠 + 分类色) + `model-distribution` (byModel Top-N) — done, 全 9 widget 注册完成
  - tests: `widget-registry.test.tsx` 守护全 catalog 已注册 (icon+component); 取数复用 insights-context / useUsageSummary
  - verify: 渲染/空态待 4.0 统一 CDP 实测 [AC3]
  - 注: top-usage 暂含 skill/mcp (subagent/plugin 用量源数据未采集); plugin 排行降级已记 (插件计数走 quick-actions)

## Phase D — 健康检查弹窗 [AC1]

- [x] D1: `health/health-entry.tsx` (toolbar 状态入口 → HeroUI Modal+useDisclosure, 复用 useHealthChecks + 移植 HealthCheckRow/分组/导航/fix snippet/info 忽略) + overview 删平铺 HealthWorklistPanel — done
  - tests: `overview-dashboard.test.tsx` 弹窗开合/分组/copy/ignore 全过; 旧 overview-health-checks(内联)同批删除 (删除纪律)
  - verify: 截图确认健康收拢为「Needs review·N」入口, 首页不再平铺 [AC1]

## Phase E — 组装 + 自定义

- [x] E1: overview.tsx host (toolbar: 标题+health-entry+自定义切换+重置) + DashboardGrid + `widget-library` (编辑态列出隐藏 widget 一键加回) — done, 完成增/删/显隐/重排/缩放闭环
  - tests: 布局 action 经 B2 纯函数覆盖; overview-dashboard 测 customize 切换/编辑态 affordance; 触 overview 后 build+app.e2e 全过 (friction 纪律)
  - verify: 默认无 chrome ✓、编辑态 affordance+library ✓、reset ✓; **重载布局保留**的 CDP 实测待 4.0 [AC4][AC2]

## Phase F — Onboarding + i18n + 抛光/性能

- [ ] F1: onboarding/空数据态 (默认布局 + 引导空态) + en/zh i18n key 全覆盖 + 大数/时长/日期 formatter (lib + unit)
  - tests: formatter unit `tests/unit/format-*.test.ts`; i18n key 存在性
  - verify: 清空/少数据下引导态 [AC8]
- [ ] F2: staggered 入场 (framer-motion, 首挂载 + reduced-motion 关) + 性能 pass (widget memo / 防抖写入 / 重排不重算)
  - tests: reduced-motion 分支可加 unit; 帧率属运行
  - verify: CDP 实测拖拽帧率 + 多 widget 同屏 + 数据不阻塞 UI [AC6][不变量 22]

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
