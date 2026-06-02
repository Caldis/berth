# 需求分析 (Explore 产物)

## 现状理解
用量页面链路是 renderer -> preload -> IPC -> main usage engine:

- 页面入口: `src/renderer/src/pages/usage.tsx`。当前页头同时放置时间范围和 `auto / actual / estimated` 三个费用口径按钮; 页面主体包含费用摘要、Token 摘要、费用说明、价格缺口、每日费用图、按模型/项目分组、速率限制空卡片、实验性功能标志空卡片。
- IPC: `src/preload/index.ts` 暴露 `usage.summary(opts)`; `src/shared/types/ipc.ts` 定义 `usage:summary` 参数 `{ days, agentView, costMode, projectPath }` 与返回 `UsageSummary`。
- 主进程: `src/main/ipc/handlers.ts` 调用 `buildUsageSummary(scanner.getAllAssets(), { days, costMode, projectPath })`。
- 汇总逻辑: `src/main/engine/usage.ts` 会在每个 Agent 分组内优先使用 `usage-data`, 其次 `stats-cache`, 最后 `session`; 汇总后输出 `actualCost / estimatedCost / costDelta / costSource / pricingMisses / byModel / byProject / dailyCosts / dailyTokenUsage`。
- 价格逻辑: `src/main/engine/pricing/*` 使用内置 LiteLLM 与 models.dev 价格快照, 并允许调用方传入 `local` 覆盖。`resolveUsageCost()` 已支持 `actual / estimated / auto`。
- Claude Code 数据来源: `src/main/adapters/claude-code/scanner.ts` 扫描 `stats-cache.json` 与 `usage-data/*.json`; `src/main/adapters/claude-code/parsers.ts` 也会从会话 JSONL 的 `message.usage` 和 summary cost 字段读取 token 与费用。
- Codex 数据来源: `src/main/adapters/codex/parsers.ts` 从 `~/.codex/sessions/**/rollout-*.jsonl` 的 `event_msg.payload.type === "token_count"` 读取 token, 当前没有官方本地 cost 字段。
- `rateLimits` 当前只存在于共享类型、normalizer 和旧 UI。`buildUsageSummary()` 的各路径均返回空数组, 没有真实数据。
- `experimentalFlags` 只在 `usage.tsx` 中渲染一个空卡片, 没有数据契约和业务输入。

## 关联与依赖
- 页面受全局 `agentView` 和 `scopeSelection` 影响。`projectPathForScope(scopeSelection)` 会传到 IPC, 主进程再用 `filterAssetsByProjectPath()` 缩小范围。
- `UsageSummary` 已经包含每个模型和项目的费用、token、费用来源、价格缺口。当前 UI 的问题不是缺少数据, 而是展示密度和解释顺序不合理。
- `CostSourceBadge` 已提供 hover/title 与 aria 描述, 能表达真实费用、估算费用、混合和未知。
- `TokenUsageDisplay` 已提供 token 分项与 hover title, 可以复用到模型/项目行。
- `sessions-pages.test.tsx` 目前覆盖用量页大部分 renderer 行为, 包括费用口径按钮、错误保留旧数据、价格缺口、本地覆盖示例。
- `usage-tooltip-label.test.tsx` 覆盖 Recharts tooltip 文案。
- `pricing.test.ts` 和 `usage-summary.test.ts` 已覆盖实际/估算成本、价格缺口和模型/项目维度数据。

外部来源:

- OpenAI API Usage/Costs 参考文档把 costs result 定义为带 `amount.currency/value`、`project_id`、`line_item` 等字段的组织费用数据: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage
- Claude Code 成本文档说明 `/usage` 的 dollar figure 是按 token 本地估算, 可能不同于真实账单; 权威账单应看 Claude Console: https://code.claude.com/docs/en/costs
- Claude Code monitoring 文档声明可导出 `claude_code.cost.usage` 和 `claude_code.token.usage`, 且 cost metric 有 model 等属性: https://code.claude.com/docs/en/monitoring-usage
- Claude Help Center 说明 Claude Code API key 用户可用 `/cost` 看当前 session token 和 dollar usage, Enterprise/订阅用户的限额和计费口径不同: https://support.claude.com/en/articles/14552983-models-usage-and-limits-in-claude-code

## 任务分类与 debt 校准
- type: feature。不是 maintenance, 因为目标是用量页功能和信息结构增强。
- source.kind / refs: `docs-issues`, 来源为 `docs/issues/2026-06-02-FEATURE-usage-model-cost-redesign.md`。
- debt estimate 修正: 初始估算是 cross-process/high/net 5。探索后确认主进程数据契约已经具备关键字段, 本次可以先收在 renderer + i18n + tests, 保持 IPC 兼容, 降为 module/medium/net 3。
- scope / risk / areas / confidence: scope=module, risk=medium, areas=`ui-ux`, `testability`, confidence=medium。
- revision: 需要写入 INDEX.md, 记录 explore 修正。

## 验收标准
1. 用量页每个模型行必须直接展示模型费用、费用来源、token、占比, 并保留价格缺口提示。
2. 用户必须能明确区分真实费用、官方/内置价格快照、本地扫描和估算; UI 文案不能把本地扫描或价格表估算说成供应商实时账单。
3. `auto / actual / estimated` 不能继续作为页头三个同权按钮; 应改为更贴近“费用口径”的局部控件, 并提供清楚说明。
4. `local override` 需要解释为本地价格覆盖, 且仍能复制覆盖 JSON 示例。
5. 速率限制与实验性功能标志不应继续占用页面空间; 若保留类型字段, UI 不展示空卡片。
6. 加载、空态、错误、刷新失败保留旧数据、时间范围切换和项目/Agent 范围参数必须保持可用。
7. 中英文 i18n 必须覆盖新增文案; 不保留已删除 UI 的孤立文案。
8. Renderer 测试必须覆盖新费用口径控件、模型费用展示、来源说明、无速率限制/实验标志空卡片。
9. 视觉验收必须确认桌面第一屏能看到费用摘要、来源说明、模型明细入口, 且无文字重叠。

## 界面质量与交互验收
现有页面是上下堆叠的卡片结构。费用摘要和 token 摘要可读, 但费用来源解释被放在中部大卡片里; 模型/项目行只在行内塞 badge 和 token, 费用数字不突出; 速率限制与实验性功能空卡片让页面显得像未完成。

主要用户路径:

- 打开 Usage, 先判断当前范围内费用是否可信。
- 切换时间范围和费用口径。
- 查看按模型的费用、token 与来源。
- 遇到价格缺口时查看原因, 复制本地价格覆盖示例。

界面风险:

- 页头按钮过多, `auto / actual / estimated` 缺乏上下文。
- 成本口径说明平铺过长, 用户容易忽略。
- 模型明细没有把费用作为主要字段展示。
- 旧空卡片占用空间但没有真实功能。
- 双列布局在窄屏可能挤压模型名、token、badge 和百分比。

## 未决问题
无。PRD 已明确需要删除无价值控件并重新设计费用来源展示; 现有数据契约足够支撑第一版实现。
