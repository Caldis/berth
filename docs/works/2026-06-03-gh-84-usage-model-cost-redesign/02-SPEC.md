# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 保持 `UsageSummary` 现有 IPC 契约不破坏:
  - `costMode`, `totalCost`, `actualCost`, `estimatedCost`, `costDelta`, `costSource`, `costExplanation`, `pricingMisses`
  - `byModel[]`: `model`, `cost`, `actualCost`, `estimatedCost`, `costDelta`, `costSource`, `pricingMisses`, `tokens`, `tokenUsage`, `percentage`
  - `byProject[]`: 同上, project 维度
  - `dailyCosts[]`, `dailyTokenUsage[]`
- 保留 `rateLimits` 字段作为兼容字段, 但 Usage UI 不再渲染速率限制区块。当前主进程没有真实 rate limit 数据, 删除 UI 不影响数据流。(验收 5)
- 不新增 OpenAI/Claude 账单 API 拉取。当前产品仍是本地扫描 + 价格表估算。官方账单和组织成本 API 只作为文案边界和后续功能参考。(验收 2)
- `costMode` 继续作为 IPC 参数, 但页面控件改为费用说明区里的 `select`, label 为费用口径, 使它和计算方式处于同一上下文。(验收 3)

## 任务分类与 debt
- type / maintenance.subtype: feature, 不设置 maintenance subtype。
- source.kind / refs: `docs-issues`, `docs/issues/2026-06-02-FEATURE-usage-model-cost-redesign.md`。
- debt.estimate: incurred=3, repaid=0, net=3, scope=module, risk=medium, areas=`ui-ux`, `testability`, confidence=medium。
- debt.final 预期: 若实现只触及 Usage renderer/i18n/tests 且通过目标测试, 预计 final net=2 或 3。
- revisions: INDEX.md 记录 explore 阶段从 net 5/high/cross-process 下调。
- Project 字段同步: 当前 item `PVTI_lAHOADXbEs4BZHvQzguiY68`, archive 前再同步 Done。
- `pnpm harness:stats` 当前 total=26/status=notice, 不需要 override。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `src/renderer/src/pages/usage.tsx`
  - 移除 `Gauge` 和 `FlaskConical` 图标导入。
  - 页头只保留页面标题、简短说明和时间范围切换。
  - 新增费用说明/来源面板, 其中包含费用口径 `select`、当前公式、来源 badge、价格来源快照、本地扫描说明。
  - 模型明细改为列表/表格式布局, 每行展示模型名、费用、source badge、token、占比、actual/estimated/delta 简短字段、token 分项 tooltip。
  - 项目明细保持条形进度, 补齐费用展示。
  - 删除速率限制和实验性功能标志区块。
- `src/renderer/src/i18n/locales/en.json` / `zh.json`
  - 新增页面 subtitle、costModeSelect、source summary、model/project cost labels、empty states。
  - 删除或停用 usage 下只服务被删除 UI 的 `rateLimits/currentWindow/remaining/resetsIn/experimentalFlags` 文案。
- `tests/renderer/sessions-pages.test.tsx`
  - 更新 cost mode 测试, 从 radiogroup 改为 combobox。
  - 新增模型费用和来源说明断言。
  - 断言 Usage 不再展示 rate limits 和 experimental flags。
- `tests/renderer/usage-tooltip-label.test.tsx`
  - 保持 Recharts mock 和 tooltip 断言可用。
- 不改 `src/main/engine/usage.ts`、`src/shared/types/asset.ts` 和 IPC 类型, 除非实现时发现 UI 无法表达必要字段。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 顶部: 标题+说明+时间范围; 中部: 费用和 token 摘要; 费用说明紧贴摘要; 下方: 日图、模型明细、项目明细。删除旧空卡片。 | renderer 测试 + Playwright/截图确认首屏无空白功能块。 |
| 组件选择 / 设计系统一致性 | 继续使用现有 Tailwind token、`NoticePanel`、`CostSourceBadge`、`TokenUsageDisplay`、Recharts。费用口径用标准 `select`, 避免三个同权按钮。 | `pnpm test ...sessions-pages...` 和手动截图。 |
| 交互反馈 / 状态切换 | 时间范围按钮保持; 费用口径 select 切换后重新请求 IPC; 本地覆盖示例仍可展开和复制。 | renderer 测试触发 select change、按钮 click。 |
| loading / empty / error / disabled / focus | 复用 skeleton; 价格/模型/项目无数据时使用具体空态; refresh 失败保留旧数据; select 和按钮可 focus。 | renderer 测试覆盖 loading/error/stale; 视觉检查 focus 不遮挡。 |
| 响应式 / 可访问性 / 键盘可达 | 大屏允许摘要双列和模型/项目双列; 小屏单列; 模型行使用 grid/flex wrap 避免长模型名挤压金额。控件有 label/aria-label。 | Playwright 桌面截图; 必要时补移动宽度截图。 |
| 文案 / i18n / 数字和路径格式 | 文案明确“本地扫描”“价格快照”“真实费用不是实时账单”; 金额走 `formatCurrency`; token 走 `formatNumber`; 中英文新增 key 对齐。 | renderer 测试断言英文; `pnpm typecheck:web` 防止 key/类型错误。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 费用口径从页头 radio 改为费用说明内 select, 并继续传 `costMode` | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm test tests/renderer/sessions-pages.test.tsx` |  |
| 模型行直接展示费用、来源、token、占比和价格缺口 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm test tests/renderer/sessions-pages.test.tsx` |  |
| 删除速率限制和实验性功能标志空卡片 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm test tests/renderer/sessions-pages.test.tsx` |  |
| 用量 tooltip 本地化仍可用 | renderer | `tests/renderer/usage-tooltip-label.test.tsx` | `pnpm test tests/renderer/usage-tooltip-label.test.tsx` |  |
| 共享费用和价格汇总逻辑未退化 | unit | `tests/unit/pricing.test.ts`, `tests/unit/usage-summary.test.ts`, `tests/unit/usage-summary-normalizer.test.ts` | `pnpm test tests/unit/pricing.test.ts tests/unit/usage-summary.test.ts tests/unit/usage-summary-normalizer.test.ts` |  |
| 类型、构建和 harness 规则 | typecheck/build/harness | n/a | `pnpm typecheck:web`, `pnpm build`, `pnpm harness:check` |  |
| UI 首屏质量 | manual/e2e | n/a | dev agent + Playwright screenshot | 自动化只能断言元素, 视觉密度和重叠需要截图复核。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 数据契约保持 `UsageSummary` 费用维度 | 1, 2, 4, 6 |
| 费用口径 select 与来源说明 | 2, 3, 4 |
| 模型/项目明细重排 | 1, 6, 9 |
| 删除 rate limits / experimental flags UI | 5, 8 |
| i18n 和文案边界 | 2, 7 |
| renderer/unit/build/visual 验证 | 6, 8, 9 |
