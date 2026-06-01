# 需求分析 (Explore 产物)

## 现状理解

1. Usage 页在 renderer 中维护 `days` 和 `costMode` 状态, 通过 `window.api.usage.summary({ days, agentView, costMode })` 调用主进程 IPC。
2. `src/main/ipc/handlers.ts` 的 `usage:summary` handler 会先 `ensureScanned()`, 再把按 `agentView` 过滤后的资产交给 `buildUsageSummary()`。
3. `src/main/engine/usage.ts` 是本地用量和成本汇总的唯一计算点。它按 agent 分组, 每个 agent 内优先使用 `usage-data`, 其次 `stats-cache`, 最后 `session` fallback。
4. 当前 `dateInRange()` 会对 `usage-data`、`stats-cache.dailyActivity`、`dailyModelTokens` 和 session fallback 都套用 `days` 过滤。`options.days <= 0` 或缺省时才是不限制时间。
5. Usage 页的时间范围配置是 `7 / 30 / 365`, 其中 `overview.timeRange.all` 实际传值为 `365`。因此 UI 上的 “All” 不是全量累计, 而是滚动 365 天。
6. 页面默认 `days = 30`, 所以默认打开时总成本也不是累计总额, 而是滚动 30 天窗口内的汇总。每天过零点后, 刚好滑出窗口的历史成本会被移除, 总额可能下降。
7. 最近确实调整过算法:
   - `a3d90ac feat: aggregate token breakdowns in usage` 在 2026-05-30 引入 `days` 过滤, 并把 `buildUsageSummary()` 改为接收 `UsageSummaryOptions`。
   - `236bc78 feat: add usage cost modes and explanations` 在 2026-05-31 引入 `costMode = auto | actual | estimated`, 但默认 `auto` 仍优先使用已有真实成本, 否则用 token + pricing catalog 估算。
8. 价格目录没有今天的本地更新。`src/main/engine/pricing/catalog.generated.ts` 仍是 `2026-05-30T14:51:53.037Z` 生成, git 记录显示该文件最近只在 `0ca81bd feat: add pricing catalog conversion` 中引入。
9. 官方/主源价格资料仍是分组件计价: OpenAI 官方价格页按 Input / Cached input / Output 展示; Anthropic 官方文档对 cache write/read 使用相对 input price 的倍率; 本仓库内置 catalog 的两个来源是 LiteLLM `model_prices_and_context_window.json` 和 `models.dev/api.json`。本次观察到的跨日下降不需要供应商价格变化即可解释。

## 关联与依赖

- Renderer:
  - `src/renderer/src/pages/usage.tsx`
  - 风险点: `TIME_RANGES` 把 “All” 绑定为 `365`, `days` 默认值为 `30`。
- IPC:
  - `src/shared/types/ipc.ts` 定义 `usage:summary` 参数为 `{ days: number; agentView?: AgentView; costMode?: CostMode }`。
  - `src/preload` 透传 IPC 契约。
- Main:
  - `src/main/ipc/handlers.ts` 透传 `days` 和 `costMode`。
  - `src/main/engine/usage.ts` 通过 `dateInRange()` 做时间窗口过滤。
  - `src/main/engine/pricing/estimate.ts` 负责 actual/estimated/auto 成本选择。
- 测试:
  - `tests/unit/usage-summary.test.ts` 已覆盖 `days` 范围过滤, 但没有覆盖 “All 不应滚动”。
  - `tests/renderer/sessions-pages.test.tsx` 覆盖 Usage 页 IPC 参数和 UI 状态, 适合加默认 All 与按钮参数测试。

## 验收标准

逐条编号, SPEC 与 verify 据此核对。
1. Usage 页 “All” 选项必须表示全量累计, 传给主进程的 `days` 值不能触发滚动 365 天过滤。
2. Usage 页默认打开时应展示全量累计口径, 避免默认总成本跨日因为滚动窗口自然下降。
3. 7 天和 30 天仍应保留滚动窗口语义, 因为这两个标签本身就是时间范围。
4. 主进程汇总需要有回归测试证明 `days <= 0` 是全量累计, 且同一批数据在 `now` 前进一天时不会因为 All 口径下降。
5. Renderer 测试需要证明默认请求使用 All 口径, 点击 30 天和 All 时 IPC 参数符合预期。
6. 不改价格目录和模型单价; 本次修复只处理时间范围语义。

## 未决问题

无。设计阶段采用以下假设: 顶部总成本默认应为累计口径; 用户显式选择 7 天或 30 天时, 总成本随该滚动窗口变化是合理行为。

## 证据

- `pnpm test -- tests/unit/usage-summary.test.ts tests/unit/pricing.test.ts`: 20 个现有相关测试通过。
- `git blame -L 38,42 -- src/renderer/src/pages/usage.tsx`: “All” 当前是 `value: 365`, 来源为初始脚手架提交 `51979bd`。
- `git blame -L 597,606 -- src/main/engine/usage.ts`: `dateInRange()` 滚动窗口过滤来源为 `a3d90ac`。
- OpenAI API pricing: https://openai.com/api/pricing/
- Anthropic Claude API pricing: https://platform.claude.com/docs/en/about-claude/pricing
- LiteLLM pricing catalog: https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json
- models.dev catalog: https://models.dev/api.json
