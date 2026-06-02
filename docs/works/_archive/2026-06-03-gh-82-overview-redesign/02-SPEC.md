# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 不新增 IPC。继续使用:
  - `useSessions({ limit: 5, agentView, projectPath })`
  - `useUsageSummary(7, agentView, projectPath)`
  - `useHealthChecks()`
  - `useAppStore()` 中的 `agentView`, `scopeSelection`, `assets`, `stats`
- 首页新增的状态只在 renderer 内计算:
  - `visibleChecks`: 过滤被忽略的 info 检查。
  - `healthSummary`: error/warning/info 数量、总体 tone、展示文案。
  - `priorityChecks`: 首页显示的待处理健康检查, 按 error -> warning -> info 排序并限制数量。
  - `scopeLabel`: 从 `scopeSelection` 与 `projectPathForScope()` 生成当前范围文案。
  - `agentLabel`: 从 i18n `agentView.*` 生成当前 agent 视角文案。
- 保留 `IGNORED_HEALTH_CHECKS_KEY` 的本地存储行为, 不改存储键。

## 任务分类与 debt
- type / maintenance.subtype: `feature`, 无 maintenance subtype。
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-FEATURE-overview-redesign.md`。
- debt.estimate: `incurred=5, repaid=0, net=5, scope=cross-process, risk=high, areas=architecture/testability/ui-ux, confidence=medium`。
- debt.final 预期: 若 renderer/e2e/视觉验证通过, archive 前降为 `risk=medium`, `confidence=high`; net 视是否新增共享组件再校准。
- revisions: Explore 阶段已将 confidence 从 low 调整为 medium。
- Project 字段同步: archive 前用 `node scripts/harness-projects.mjs done docs/works/2026-06-03-gh-82-overview-redesign`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- 主要修改 `src/renderer/src/pages/overview.tsx`。
- 小组件保留在 `overview.tsx` 内部, 避免为单页过早抽象:
  - `OverviewHero`: 标题、当前 agent / scope、健康总体状态。
  - `OverviewMetricButton`: 能力入口, 用按钮语义跳转新路由。
  - `RecentSessionsPanel`: 最近会话列表、加载、空态。
  - `UsageSnapshotPanel`: 费用总览、费用来源、近 7 天图表、空态。
  - `HealthWorklistPanel`: 健康待处理列表、状态摘要、动作。
- 不改 `use-ipc.ts`, 除非实现时发现 Overview 必须暴露错误态; 当前需求可通过现有 loading/stale/empty 处理。
- i18n 只补 `overview.*` 文案, 不改其他页面文案。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 顶部做 compact hero, 右侧/下方给健康总体状态; 主体用 `lg:grid-cols-[1.25fr_0.75fr]`, 最近会话作为主列, 用量和健康作为辅助列; 能力入口用横向 compact 按钮而不是 4 张大卡。 | renderer 测试查核心区域; e2e 截图检查首屏不挤压、不重复大段说明。 |
| 组件选择 / 设计系统一致性 | 继续使用 Tailwind token、lucide-react、`EmptyState`、`TokenUsageDisplay`、`CostSourceBadge`、Recharts; 半径控制在 `rounded-lg`/`rounded-xl`, 不做彩色渐变和装饰光效。 | 代码审查和截图。 |
| 交互反馈 / 状态切换 | 能力入口、最近会话、健康检查仍是按钮/可点击行, hover/focus 有明确反馈; 健康检查详情动作保留。 | renderer 测试触发 click/keyDown; e2e 点首页能力入口。 |
| loading / empty / error / disabled / focus | sessions loading 使用骨架行; sessions empty 使用 `EmptyState`; usage empty 使用空态; health loading/stale/normal/problem 都有状态 tag。当前 hook 无 error 输出, 不新增伪 error。 | renderer 测试覆盖 loading/empty/normal/problem。 |
| 响应式 / 可访问性 / 键盘可达 | 默认单列, `lg` 后双列; 所有点击入口使用 button 或 role/button + keydown; icon button 维持 aria-label/title。 | renderer 测试 aria; e2e 检查桌面首屏。 |
| 文案 / i18n / 数字和路径格式 | 新增中英文范围、健康摘要、空态文案; 继续使用 `formatOptionalRelativeTime`, `truncatePath`, `formatCurrency`, `formatOptionalCurrency`。 | renderer 中英文断言, 确认不显示 raw enum。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 新首页信息结构、agent/scope、能力入口新路由 | renderer | `tests/renderer/overview-redesign.test.tsx` 或更新现有 Overview 测试 | `pnpm test tests/renderer/overview-redesign.test.tsx tests/renderer/overview-health-checks.test.tsx tests/renderer/sessions-pages.test.tsx` | 不适用 |
| 健康检查动作保留 | renderer | `tests/renderer/overview-health-checks.test.tsx` | 同上 | 不适用 |
| 最近会话字段和项目范围传参 | renderer | `tests/renderer/sessions-pages.test.tsx` | 同上 | 不适用 |
| 费用来源 badge、未知费用、图表空态 | renderer | `tests/renderer/overview-health-checks.test.tsx` 或 `overview-redesign.test.tsx` | 同上 | 不适用 |
| 默认首页在 Electron 中可见、核心区域出现 | e2e | `tests/e2e/app.e2e.ts` | `pnpm test:e2e tests/e2e/app.e2e.ts` | 不适用 |
| 类型、全局 harness | static/harness | 无新增文件 | `pnpm typecheck:web`, `pnpm harness:check` | 不适用 |
| 视觉桌面验收 | manual + screenshot | 临时截图写 `$env:TEMP` | `pnpm dev:agent start ...` 后用 Electron/CDP 截图 | 自动化断言不能充分证明视觉层级和首屏密度 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 当前 agent/scope hero | AC1, AC7, AC8 |
| 健康总体状态与待处理列表 | AC2, AC3, AC7, AC8 |
| 最近会话面板 | AC4, AC8, AC9 |
| 用量/费用摘要 | AC5, AC8, AC9 |
| 能力入口新路由 | AC6, AC9 |
| i18n 与格式化 | AC5, AC7, AC9 |
| renderer/e2e/视觉验证 | AC7, AC8, AC9 |
