# 技术方案 (Design 产物)

GH-138 模块化可拖拽自定义首页仪表盘。决策已定 (用户): 视觉=克制编辑感; 自定义=**导轨式** (拖拽重排 + 尺寸预设 + 显隐, 非自由网格); 范围=全量一次到位。frontend-design 方法论应用于"克制即方向, 靠间距/排版/细节精确执行"。每条回指 01-ANALYSIS 验收标准编号 [AC#]。

## 0. 关键技术决策 (相对 explore 的收敛)
- **不引入 react-grid-layout**: 导轨式不需自由像素网格, 绕开 RGL 的 React19/findDOMNode 风险。
- **布局引擎 = 响应式 CSS Grid + 尺寸预设跨度**; **重排 = `@dnd-kit/sortable` 10.0.0 + `@dnd-kit/core` 6.3.1 + `@dnd-kit/utilities` 3.2.2** (peerDep react>=16.8, ref-based 无 findDOMNode, 内置键盘可达; 安装时跑 smoke spike 实证 React19)。归 devDependencies (renderer 库, ARCHITECTURE 打包规则 10)。
- **数据后端 = 单一聚合通道**: 新增 1 个 IPC `insights:dashboard` 返回结构化 `DashboardInsights` (热力图/streak/峰值/排行/洞察一次取回), 而非 5 个通道 — 减少四方对账面 + 单次往返 + 经 selector-cache 按 snapshot.id memo。趋势/构成/模型复用既有 `usage:summary`, 不新增通道。
- **plugin 用量排行**: session.meta 当前无 pluginsUsed; "最常用"widget v1 覆盖 skills/mcp/subagents。若实现期确认 session 源数据无 plugin 调用记录, plugin 排行降级并记 docs/issues 跟踪 (不臆造数据)。

## 1. 数据契约

### 1.1 新增 engine 聚合 (`packages/berth-scan-engine/src/engine/activity-insights.ts`, 纯函数)
```
buildActivityHeatmap(sessions: Asset[], opts:{days:number}): {
  days: Array<{ date: string /*YYYY-MM-DD 本地日*/, sessions: number, tokens: number }>,
  maxSessions: number, maxTokens: number
}
buildStreakStats(sessions: Asset[]): { current: number, longest: number, lastActiveDate: string|null }
buildPeakMetrics(sessions: Asset[]): {
  cumulativeTokens: number, peakDailyTokens: number, peakSessionTokens: number,
  maxSessionDurationSeconds: number, totalSessions: number
}
buildTopUsage(sessions: Asset[], opts:{kind:'skill'|'mcp'|'subagent', limit:number}): Array<{ name:string, count:number, pct:number }>
buildActivityInsights(sessions: Asset[], stats: AssetStats): {
  skillsExplored:number, totalSkillInvocations:number, totalSessions:number,
  topModel: string|null, agentSplit: Array<{agentId:string,count:number}>
}  // 仅产出数据可支撑的字段; 不可得字段省略, 不臆造 (如 Codex 的"快速模式%/推理强度"berth 无对应源 → 不做)
buildDashboardInsights(sessions, stats, opts): DashboardInsights  // 编排上述, 供 runtime/IPC 调用
```
- 日界定义与 `usage.ts` 的 `dailyTokenUsage` 对齐 (按 `startedAt` 本地日), 避免热力图与趋势图错位 [AC5]。
- token 取 `SessionSummary.tokens` (totalTokens); duration 取 `duration` 秒。

### 1.2 新增 IPC 通道 (四方对账, GH-115)
`insights:dashboard` — args `[{ days?:number=365, agentView?:AgentView, projectPath?:string }]`, result `DashboardInsights`。
- `pkg:shared/types/ipc.ts` IpcChannels 表 + `DashboardInsights` 类型
- `src/main/ipc/handlers.ts` registerInsightsHandlers → `runtime.getDashboardInsights(opts)`
- `src/preload/index.ts` `window.api.insights.dashboard(opts)`
- `tests/setup.ts` mock 键
- runtime: `getDashboardInsights` 经 `select('insights:${snapshotId}:${argsKey}', …)` selector-cache memo (重算只随 snapshot 变化, 不随 UI)。

### 1.3 布局配置 (renderer, localStorage)
`berth-dashboard-layout` = `{ version:1, widgets: Array<{ id:WidgetId, size:WidgetSize, hidden:boolean }> }` (数组序 = 渲染序)。纯函数 `lib/dashboard-layout.ts`: `parse(raw)→Layout`、`migrate(layout, registry)` (丢未知 id / 末尾追加新注册 widget 默认尺寸)、`serialize(layout)`、`resetToDefault(registry)`。复用 theme-provider 直读直写模式。

## 2. 模块结构 / 组件拆分 (遵守 ARCHITECTURE 边界)

```
src/renderer/src/
  components/dashboard/            # 新增 widget 仪表盘领域层 (建在 components/ui 之上)
    widget-registry.ts            # WidgetId 枚举 + WidgetDefinition 注册表 (加 widget = 加一条) [AC7]
    widget-types.ts               # WidgetDefinition / WidgetSize / WidgetRenderProps 契约
    dashboard-grid.tsx            # CSS Grid host + DndContext/SortableContext 重排 [AC4]
    widget-shell.tsx              # 无边框语义容器: 标题行 + hover/edit 态 affordance(拖拽柄/尺寸循环/隐藏); 无 className 逃生舱
    dashboard-toolbar.tsx         # 标题 + scope + 健康入口 + 自定义(编辑)切换
    widget-library.tsx            # 编辑态: 添加已隐藏 widget + 重置默认
    use-dashboard-layout.ts       # 读写 localStorage 布局 + reorder/resize/toggle action
    widgets/                      # 各 widget 实现 (每个独立数据 hook + memo)
      stats-band.widget.tsx       # 概览指标带 (Wide) — 累计/峰值token/最长时长/streak/会话数 [AC3]
      activity-heatmap.widget.tsx # 年度活动热力图 (Wide/XL) 每日/每周/累计切换 [AC3]
      activity-insights.widget.tsx# 活动洞察 (M) [AC3]
      top-usage.widget.tsx        # 最常用 skill/mcp/subagent 排行 (M) [AC3]
      recent-sessions.widget.tsx  # 最近会话 (M/L) — 移植现有 panel
      usage-trend.widget.tsx      # token/cost 趋势 (M/L) — 泛化现有 7d 图
      token-breakdown.widget.tsx  # token 构成 input/output/cache/reasoning (M)
      model-distribution.widget.tsx# 模型分布 (M)
      quick-actions.widget.tsx    # 快捷入口 (M) — 移植现有 metrics 卡
  components/dashboard/health/
    health-modal.tsx              # 健康检查弹窗 (HeroUI Modal + useDisclosure), 复用 useHealthChecks + 现有分组/导航/fix [AC1]
    health-entry.tsx              # toolbar 健康入口 (worst severity + count), 点击开 modal
  lib/dashboard-layout.ts         # 布局纯函数 (parse/migrate/serialize/reset) — 直测
  lib/widget-chart.tsx 或 components/ui? # Recharts 复用 wrapper (按需, 收敛重复 BarChart)
  pages/overview.tsx              # 瘦身为 dashboard host: <DashboardToolbar/> + <DashboardGrid/>; 删平铺 HealthWorklistPanel
packages/berth-scan-engine/src/engine/
  activity-insights.ts            # 新增聚合纯函数
```
- 复用: `useHealthChecks`/Health* (仅迁容器到 modal, 数据链不变)[AC1]; `CachedResource` SWR (每 widget 独立数据, memo, 重排不重算)[AC6]; `lib/chart-colors.ts`; `components/ui/motion.ts`。
- ARCHITECTURE 合规: widget 只从 `@/components/ui` 取 primitive; widget-shell 为语义 composite 不暴露外观 className; engine 聚合在 pkg engine 层纯函数; IPC 四方同批。

### 尺寸预设 → CSS Grid 跨度 (4 列基准)
| 预设 | xl(4列) | md(2列) | sm(1列) | 用途 |
|---|---|---|---|---|
| S | 1×1 | 1×1 | 1×1 | 小指标/快捷 |
| M | 2×1 | 1×1 | 1×1 | 常规 widget |
| L | 2×2 | 2×2 | 1×2 | 详情/列表 |
| Wide | 4×1 | 2×1 | 1×1 | 指标带/趋势 |
| XL | 4×2 | 2×2 | 1×2 | 热力图 |
- `grid-auto-flow: row` + 统一行高; 序 = 视觉序 (拖拽改数组序)。dnd-kit `rectSortingStrategy`。

## 3. 界面质量与交互验收 (克制编辑感)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 无卡片框; widget 间留白 + 必要发丝线 (`border-border/60`); 标题小号弱化, 数据主导 (data-ink); 大字号 `tabular-nums` 数字; 沿用现有字体系统 (不引入冲突 display 字体, 靠字重/字号/字距/tabular 提炼 — 单页一致性优先于新奇, 显式取舍) | 用户截图裁定 [AC9] |
| 组件选择 / 设计系统一致性 | primitive 仅经 `@/components/ui`; widget-shell 语义 composite; 热力图单色相 ramp (berth 强调色, 非 GitHub 绿), `--chart-*` 克制使用 | 代码评审 + 截图 |
| 交互反馈 / 状态切换 | 默认无 chrome; hover 显 widget affordance; "自定义"切换进编辑态 (全 widget 显拖拽柄/尺寸循环/隐藏 + widget-library + 重置); 拖拽 spring 反馈; 尺寸切换布局过渡 (framer-motion, 尊重 reduced-motion + motion token) | 运行实测 [AC4] |
| loading / empty / error / disabled / focus | 每 widget 独立: skeleton(animate-pulse)/empty(引导文案)/error(retry); 编辑态空位提示; modal focus-trap; 拖拽中/resize 中态 | 运行实测 [AC2][AC9] |
| 响应式 / 可访问性 / 键盘可达 | grid 列随宽收敛 (4→2→1); dnd-kit 键盘排序 (Tab 取 widget, 方向键移, Esc 取消); modal Esc/focus-trap; aria-label 拖拽柄/尺寸/隐藏 | 运行实测 + 键盘走查 [AC9] |
| 文案 / i18n / 数字和路径格式 | en/zh i18n key 全覆盖新文案; 大数 `7.24B`/`6.8M` 紧凑格式 (复用现有 formatter 或新增 lib); 日期本地化; 时长 `3h 51m` | 代码评审 + 截图 |
| onboarding / 空数据 | 首次/稀疏数据: 默认布局 + 有意义空态 (说明该 widget 将展示什么 + 指向扫描/使用 agent), 非占位灰块 | 运行实测 (清空/少数据) [AC8] |

### 视觉系统要点 (frontend-design 执行细节)
- 强调色单一来源 = 既有 `--primary`/accent; 其余中性。热力图 = 强调色 5 档明度 ramp (空档=极淡中性, 非纯灰块)。
- 入场: 首挂载 staggered reveal (widget 依序 fadeRise, `animation-delay` 阶梯), 仅首次, reduced-motion 关闭。
- 间距走编辑节奏 (区块间大留白, widget 内紧凑); 不堆装饰、不加圆角卡片阴影 (与"沉静浮面"方向区分)。

## 4. 性能方案 [AC6]
- 每 widget `React.memo` + 自有 SWR 数据 hook → 拖拽/重排只移 DOM, 不触发数据重算/refetch。
- 聚合在 runtime selector-cache (snapshot.id 键) memo → 年度热力图等重算只随数据变化。
- 热力图 365 格用轻量 div/SVG grid (365 节点可接受); 不需虚拟化。
- 入场动画仅首挂载; 布局过渡用 transform (合成层)。
- 布局写 localStorage 防抖 (拖拽/缩放结束写一次)。
- 验收: CDP 实测拖拽帧率 + 数据不阻塞 UI (不靠静态绿) [不变量 22]。

## 5. 任务分类与 debt
- type: feature; source.kind: user-request; refs: #138。
- debt.estimate: incurred 16 / net 16 / cross-process / high / [ui-ux,architecture] / medium (explore 修订)。
- debt.final 预期: 导轨式 (绕开 RGL) + 单聚合通道 + 复用现有 health/SWR/chart-colors 降低净负债; 预期 incurred≈14, repaid 0~2 (widget registry 抽象提升后续复用)。verify/archive 前定稿。
- revisions: explore 已记一条; design 维持 estimate (架构收敛降风险但范围全量, net 不下调)。
- Project 字段同步: archive 由 `harness-projects.mjs done` 同步最终 debt。

## 6. 测试策略 (每实现项须有测试证据或明确例外; 不变量 16)

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| activity-insights 聚合 (heatmap 分桶/streak 跨空档/peak max/topUsage 计数排序并列/insights 计数) | unit | `tests/unit/activity-insights.test.ts` | `pnpm test` | — |
| dashboard-layout 纯函数 (parse/migrate 丢未知+追加新/corrupt→default/serialize) | unit | `tests/unit/dashboard-layout.test.ts` | `pnpm test` | — |
| widget-registry 完整性 (每 def 必填字段 + 合法 size) | unit | `tests/unit/widget-registry.test.ts` | `pnpm test` | — |
| 新 IPC `insights:dashboard` 四方一致 | unit (既有契约测试自动覆盖) | `tests/unit/ipc-contract.test.ts` / `ipc-registration.test.ts` | `pnpm test` | — |
| 数字/时长/大数 formatter | unit | `tests/unit/format-*.test.ts` | `pnpm test` | — |
| 健康 modal open/close/dismiss | renderer | `tests/unit/health-modal.test.tsx` | `pnpm test` | — |
| 拖拽重排 + 尺寸切换 + 隐藏 + **持久化重载保留** | manual/CDP 运行实测 | 4.0-verify 记录 | dev:agent screenshot + reload | dnd-kit 指针拖拽 + localStorage 重载属时序/集成行为, 不变量 22 要求真跑观察, 单测不能证 |
| staggered 入场 + 多 widget 同屏帧率 | manual/CDP | 4.0-verify 记录 | CDP 时序采集 | 时序/渐进可观测性, 不变量 22 |
| 视觉 taste (克制编辑感落地) | manual | 4.0-verify 截图 | 截图 | 主观 taste 用户裁定 [不变量 22] |

## 7. 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| §2 health-modal/health-entry + 删平铺 panel | AC1 |
| §2 dashboard-grid/widget-shell/registry 模块化 | AC2, AC7 |
| §2 widgets/* (9 个多形态 widget) | AC3 |
| §2 dnd-kit 重排 + 尺寸预设 + 显隐 + §1.3 持久化 | AC4 |
| §1 engine 聚合 + IPC 真实数据 + CDP 实测 | AC5 |
| §4 性能方案 + CDP 帧率 | AC6 |
| §2 widget-registry 契约 (低成本扩展) | AC7 |
| §3 onboarding/空数据 | AC8 |
| §3 界面质量表 + 视觉系统 | AC9 |
