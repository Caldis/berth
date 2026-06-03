# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

保留 `SessionActivityMetrics` 字段, 但主进程不再计算 token/min:

```ts
type SessionTokenRateSource = 'unavailable'

interface SessionActivityMetrics {
  tokenRatePerMinute: number | null
  tokenRateDurationSeconds: number | null
  tokenRateSource: SessionTokenRateSource
  tokenRateStartedAt: string | null
  tokenRateEndedAt: string | null
  tokenRateTokenCount: number | null
  tokenRateSampleCount: number
  tokenRateIdleGapSeconds: number
}
```

规则:

- UI 文案改为 `Token consumption rate` / `Token 消耗速率`, 避免表达成模型吞吐率。
- 主进程始终返回 `tokenRatePerMinute: null` 与 `tokenRateSource: 'unavailable'`。
- `tokenRateDurationSeconds`, `tokenRateStartedAt`, `tokenRateEndedAt`, `tokenRateTokenCount`, `tokenRateSampleCount`, `tokenRateIdleGapSeconds` 均返回空值或 0。
- hover/focus 层不展示公式, 改为说明: 本地 usage/token_count 事件包含重复输入和缓存上下文, 会产生误导性的 `tok/min` 数值, 因此暂不计算。
- 不做阈值、cap、最近窗口等补丁式处理; 这些仍会把经验规则包装成可解释指标。

## 任务分类与 debt

- type / maintenance.subtype: `bug`
- source.kind / refs: `user-request`, `https://github.com/Caldis/berth/issues/95`
- debt.estimate: `incurred=4 / repaid=0 / net=4 / scope=module / risk=medium / areas=ui-ux,testability / confidence=medium`
- debt.final: verify 填写; 最终以屏蔽计算为准。
- revisions: explore 已将 confidence 从 low 调整为 medium。
- Project 字段同步: 已通过 `node scripts/harness-projects.mjs ensure docs/works/2026-06-04-gh-95-fix-session-token-rate` 回写真实 item id。

## 模块结构 / 组件拆分

- `src/main/ipc/session-activity.ts` 只返回 unavailable metrics, 不读取 raw 样本。
- `src/shared/types/ipc.ts` 将 token rate source 收紧为 `unavailable`。
- `src/renderer/src/pages/session-detail.tsx` 继续使用 `SignalMetric`, 为 token 消耗速率保留 hover/focus explanation popover, 解释为什么暂不计算。
- `tests/unit/session-activity.test.ts` 覆盖有 usage 元数据时仍不计算。
- `tests/renderer/sessions-pages.test.tsx` 覆盖改名、placeholder、source 文案和 hover 说明。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 Session Detail 网格层级; token 消耗速率仍在 Session signals 内, hover 层只在指标内出现 | renderer 测试 + UI 验收确认不新增常驻大段说明 |
| 组件选择 / 设计系统一致性 | 继续使用 `SignalMetric`, 在指标右上提供 `Info` hover/focus 说明 | renderer 测试覆盖说明内容, focus 可达 |
| 交互反馈 / 状态切换 | 始终显示 `—`; hover 说明该指标暂不计算以及原因 | unit 测主进程不计算, renderer 测说明内容 |
| loading / empty / error / disabled / focus | 本次不改加载、空态、错误态、禁用或 focus | renderer 目标测试不退化 |
| 响应式 / 可访问性 / 键盘可达 | 不改 tab、折叠区和焦点结构 | 不需要额外 UI 改动 |
| 文案 / i18n / 数字和路径格式 | 改名为 `Token consumption rate` / `Token 消耗速率`; source 为 `Not calculated` / `暂不计算`; hover 明确本地 usage 事件会误导 | i18n/typecheck + renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| usage 元数据存在时仍不计算 token rate | unit | `tests/unit/session-activity.test.ts` | `pnpm vitest run tests/unit/session-activity.test.ts` | 不适用 |
| Session Detail 改名、placeholder 和 hover 解释 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| 类型与 harness 任务态有效 | typecheck/harness | node/web/harness | `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-95-fix-session-token-rate` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 主进程屏蔽 token/min 计算 | 1, 2, 3 |
| IPC source 收紧为 unavailable | 4 |
| UI 改名并通过 hover 解释暂不计算 | 2, 5 |
| 测试与检查矩阵 | 6 |
