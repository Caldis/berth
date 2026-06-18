# 需求分析 (Explore 产物)

GH-138 重构首页总览为模块化可拖拽自定义仪表盘。源: 00-PRD.md (三轮 user-request)。

## 现状理解

### Overview 页 (renderer)
- 入口 `src/renderer/src/pages/overview.tsx` (~788 行), 路由 `App.tsx` `<Route path="/" element={<Overview/>}/>`, 外包 `PageErrorBoundary`。
- 当前区块 (固定布局, `space-y-5` 垂直栈 + 响应式 grid):
  1. Hero (标题 + scope pills + `HealthSummaryCard` L647)
  2. Metrics — 4 个快速操作卡 (skills/mcp/sessions/plugins), `grid-cols-1 sm:2 xl:4`
  3. `RecentSessionsPanel` (L266) — 最近 5 会话
  4. `UsageSnapshotPanel` (L342) — 7 天成本 Recharts BarChart
  5. `HealthWorklistPanel` (L431) — **健康检查平铺在右侧 (~30% 宽, `xl:grid-cols-[1.18fr_0.82fr]`)**
- 健康检查链路: `useHealthChecks()` (hooks/use-ipc.ts:596, 60s TTL, 订阅 `assets:changed` 软刷新) → `window.api.assets.healthCheck` → IPC `assets:health-check` → `runtime.getHealthChecks` → `runHealthChecks` (engine/health.ts:98)。按 agent 分组, error→warning→info 排序, info 级可经 localStorage `berth-ignored-health-checks` 忽略。已存在 `HealthSummaryCard`(L647)/`HealthStatusBadge`(L666) — **天然弹窗入口**。
- 局部 skeleton/empty/error: 每区块独立 (CachedResource TTL), 无全屏遮罩。

### 数据层 (engine + IPC)
- `engine/session-activity.ts` 是**空壳** — `toSessionActivityMetrics` 全返回 null/unavailable (test 钉死)。当前不产出任何活动指标。
- `SessionSummary` (engine/session-detail.ts:43) 字段: id/agentId/title/project/projectPath/startedAt/endedAt/duration/cost/tokens/tokenUsage(breakdown)/model/skillsUsed[]/mcpServers[]/hooksFired。**热力图/streak/峰值/排行所需原料齐备**。
- `UsageSummary` (engine/usage.ts) 已有 totalTokens/dailyCosts[]/dailyTokenUsage[]/byModel[]/byProject[], 但仅覆盖最近 N 天。
- `AssetStats` (assets:snapshot): skills/mcpServers/sessions/plugins/hooks/commands/subagents 计数。
- IPC 现成: `assets:snapshot` `assets:status` `sessions:list` `sessions:get` `usage:summary` `assets:health-check`。
- **plugin 使用次数无采集**: session.meta 有 skillsUsed[]/mcpServers[] 但无 pluginsUsed[]; "最常用插件"排行需扩 scanner 或降级为 skill/mcp 排行。

### UI 基建
- `components/ui/` 唯一 primitive 入口: Modal/Drawer/Popover/Tooltip/Card/Tabs/Skeleton/Accordion/Dropdown/Table + `useDisclosure` 全可用; 健康弹窗样板 `settings-dialog.tsx`。
- Recharts ^2.15 已用 (overview/usage BarChart) 但**无可复用图表 composite**; `lib/chart-colors.ts` 有 CHART_CATEGORICAL + `--chart-1..5` CSS 变量。
- 持久化样板: localStorage 直读直写 (theme-provider `berth-theme`/`berth-accent`); Zustand `stores/app.ts` **未用 persist 中间件**。
- 性能样板: `hooks/cached-resource.ts` (TTL+signature SWR) · `react-virtuoso` GroupedVirtuoso · `components/ui/motion.ts` token · framer-motion ^12.40 (drag 手势)。

### 关键缺口: 拖拽缩放网格库
- package.json **无任何** react-grid-layout / @dnd-kit / react-rnd / gridstack / react-resizable。已有: framer-motion ^12.40 (drag)、@floating-ui ^0.27、react-virtuoso ^4.18。
- 外部检索 (npm registry + GitHub README, 2026-06):
  - `react-grid-layout` latest **2.2.3** (2026-03 发布), peerDep `react >= 16.3.0`, deps 仍含 `react-draggable@^4.4.6` + `react-resizable@^3.1.3`。**README 自述 "React 18+", 未声明 React 19**; v2 为 TS 重写 + hooks API。manifest 仍带 react-draggable 与 README 措辞有出入。
  - react-draggable@4 历史依赖 `findDOMNode` (React 19 已移除); 是否经 `nodeRef` 规避未确证 → **RGL 在 React 19 运行时是否可用必须实测 spike 验证, 不可凭 peerDep 范围假定**。
  - 备选: `@dnd-kit` (React 19-native, 但无 resize/无网格逻辑, 需自建) · 自建 framer-motion (已在仓, 控制力最强但工作量最大)。

## 关联与依赖 (blast radius, 符号边界)
- `pages/overview.tsx`: 仅被 `App.tsx` 路由 import; 重构为 dashboard host 不外溢其它页面。
- 新增 `components/dashboard/*` (widget framework / grid / 各 widget / config) — 全新, 无反向依赖。
- 新增 `engine/activity-insights.ts` 聚合纯函数 (engine 层)。
- **IPC 四方对账强约束** (GH-115): 新增 insights 通道须同批改 `pkg:shared/types/ipc.ts` (IpcChannels) + `src/main/ipc/handlers.ts` + `preload/index.ts` + `tests/setup.ts` mock; 不一致即红 (`ipc-contract.test.ts`/`ipc-registration.test.ts`)。
- 健康弹窗复用既有 `useHealthChecks` + Health* 组件, 仅改"展示容器" (平铺 panel → Modal); 数据链路不变。
- 新增 1 个网格依赖 (package.json devDependencies; renderer 库归 devDep, 见 ARCHITECTURE 打包规则 10)。
- 配置持久化新增 localStorage key (如 `berth-dashboard-layout`), 复用 theme-provider 模式。

## 任务分类与 debt 校准
- type: feature (不变); source.kind: user-request; refs: issue #138。
- debt estimate 修正: incurred 14 → **16** (explore 确认 cross-process 后端工作: ~5 新 IPC 通道 + engine 聚合 + 可能 scanner 扩展 + DnD 库集成 + widget framework + 持久化)。
- scope: cross-process (确认); risk: high (确认 — RGL React 19 未证 + 性能硬约束 + 新数据后端 + 四方对账); areas: [ui-ux, architecture]; confidence: low → **medium** (现状已摸清, 唯一大未知是 DnD 库实测)。
- revision: 见 INDEX `debt.revisions[]` (explore 追加一条)。

## 验收标准 (SPEC 与 verify 据此核对)
1. 健康检查不再平铺首页; 收拢为弹窗, 由 Hero 状态入口 (HealthSummaryCard/Badge) 点击打开; open/focus-trap/Esc-dismiss/键盘可达完整; 数据与现有 `useHealthChecks` 一致 (含 info 忽略)。
2. 首页由模块化 widget 组成 (非固定平铺); 每个 widget 自声明数据需求与渲染, 独立 loading/empty/error 态。
3. 提供一组多形态可视化 widget (至少): 指标卡 (累计/峰值 token、最长时长、当前/最长 streak)、GitHub 风格年度活动热力图 (每日/每周/累计切换)、活动洞察、Top-N 排行 (skill/mcp; plugin 视数据可得性)。
4. widget 可拖拽改位置 + 调整大小 + 增删/显隐; 布局配置持久化, 重启后保留。
5. widget 数据真实聚合自已扫描资产 (非 mock); 时序/多源可视化按不变量 22 真跑 (CDP 时序) 观察, 不以 unit+CI 静态绿代替。
6. 多 widget 同屏 + 拖拽/缩放交互流畅 (性能验收: 拖拽不掉帧、数据聚合不阻塞 UI)。
7. 架构支持低成本新增 widget (widget 注册表 + 统一契约; 可维护/可复用/可扩展)。
8. Onboarding: 首次/空数据态被设计为引导体验 (默认布局 + 有意义空态), 非占位。
9. 界面质量: 完整状态设计 (加载/空/错误/禁用/focus/拖拽中/resize 中)、响应式、可访问性、视觉一致性; 主观 taste 由用户截图裁定。

## 界面质量与交互验收
- 现有页面结构/密度: 见"现状理解"; 当前固定区块 + 局部 skeleton, 信息密度中等。
- 设计系统用法: 严格 `@/components/ui` 单入口 (页面禁止直 import @heroui/react); 语义 composite 不暴露外观 className 逃生舱 (ARCHITECTURE 规则 6)。新 widget 体系须遵此 — widget 卡片为语义 composite。
- 用户已知视觉取向 (记忆): 偏克制/refined, 拒绝灰色块 (gray slab)、card-box 分组堆叠、刺眼蓝色 metadata。新仪表盘视觉须贴合此取向, 不堆装饰。
- 风险: (a) 拖拽缩放库的 Portal/focus/碰撞/transition 行为属外部 primitive, 按不变量 9/22 先查文档再实现; (b) 多 widget 同屏性能; (c) 弹窗 focus-trap/dismiss/键盘; (d) 热力图 SVG/canvas 大量节点渲染性能。

## 未决问题 (留给 design 向人澄清, 最多 3 个关键项)
1. **自定义交互模型**: 自由网格 (拖到任意位置 + 自由 resize, Grafana 式, 即用户字面诉求) vs 结构化 (增删/重排 + 尺寸预设 S/M/L, 更可控更易出彩、防乱布局)。影响整个架构与 UX。
2. **v1 构建优先级**: 框架优先 (先打磨拖拽/缩放/持久化 widget 系统 + 健康弹窗 + 4-5 个高价值 widget, 再扩 widget 库) vs 广度优先 (先堆多种 widget 形态, 自定义打磨后置)。影响计划与早期可见价值。
3. **视觉/审美方向**: 克制编辑感 (data-ink, 低装饰, 贴合既有 berth 取向) vs 富仪表盘 (更多分类色、密度更高、接近 Codex 截图) vs 混合。影响视觉系统基调。
- 次要 (Agent 自决, 记录): DnD 库选型 (RGL 待实测→否则 dnd-kit+自建 resize); 持久化用 localStorage (复用现模式); plugin 排行视数据可得性降级为 skill/mcp。
