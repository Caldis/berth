# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

不改 `SessionActivityMetrics` 字段:

```ts
type SessionTokenRateSource = 'usage-events' | 'unavailable'

interface SessionActivityMetrics {
  tokenRatePerMinute: number | null
  tokenRateDurationSeconds: number | null
  tokenRateSource: SessionTokenRateSource
  tokenRateStartedAt: string | null
  tokenRateEndedAt: string | null
}
```

规则:

- 只有 `totalTokens > 0` 且 `usageDuration >= 60` 秒时返回 `usage-events` 和 `tokenRatePerMinute`。
- `usageDuration` 缺失、为 0、或小于 60 秒时返回 `tokenRatePerMinute: null` 与 `tokenRateSource: 'unavailable'`。
- `tokenRateDurationSeconds` 继续返回已知 usage duration, 方便后续调试; renderer 目前只用 source 和 rate。

## 任务分类与 debt

- type / maintenance.subtype: `bug`
- source.kind / refs: `user-request`, `https://github.com/Caldis/berth/issues/95`
- debt.estimate: `incurred=3 / repaid=0 / net=3 / scope=module / risk=medium / areas=ui-ux,testability / confidence=medium`
- debt.final 预期: verify 填写。
- revisions: explore 已将 confidence 从 low 调整为 medium。
- Project 字段同步: 已通过 `node scripts/harness-projects.mjs ensure docs/works/2026-06-04-gh-95-fix-session-token-rate` 回写真实 item id。

## 模块结构 / 组件拆分

- 新增 `src/main/ipc/session-activity.ts`, 放置纯函数 `toSessionActivityMetrics()` 和最小 duration 阈值, 避免在 `handlers.ts` 中测试 Electron 依赖。
- `src/main/ipc/handlers.ts` 删除本地 `toSessionActivityMetrics()` 实现, 改为导入纯函数。
- 新增 `tests/unit/session-activity.test.ts`, 覆盖过短窗口、可靠窗口和缺少 token 三类状态。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 Session Detail 布局; token rate 仍在 Session signals 网格内 | renderer 现有测试 + 人工确认不新增 UI 结构 |
| 组件选择 / 设计系统一致性 | 继续使用 `SignalMetric` 和现有 i18n source 文案 | renderer 测试覆盖显示状态 |
| 交互反馈 / 状态切换 | reliable 显示 `tok/min`; unreliable 显示 `—` | unit 测主进程 source/rate, renderer 现有 unknown 测试继续通过 |
| loading / empty / error / disabled / focus | 本次不改加载、空态、错误态、禁用或 focus | renderer 目标测试不退化 |
| 响应式 / 可访问性 / 键盘可达 | 不改 tab、折叠区和焦点结构 | 不需要额外 UI 改动 |
| 文案 / i18n / 数字和路径格式 | 复用 `Usage events` / `Not enough timing data`; 数值格式不变 | i18n/typecheck + renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 过短 usage 窗口不返回 token rate | unit | `tests/unit/session-activity.test.ts` | `pnpm vitest run tests/unit/session-activity.test.ts` | 不适用 |
| 可靠 usage 窗口仍返回 `usage-events` rate | unit | `tests/unit/session-activity.test.ts` | `pnpm vitest run tests/unit/session-activity.test.ts` | 不适用 |
| Session Detail unknown 状态继续显示 `—` 和原因文案 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| 类型与 harness 任务态有效 | typecheck/harness | node/web/harness | `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-95-fix-session-token-rate` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 主进程最小 usage duration gate | 1, 2, 3 |
| IPC 字段不变 | 4 |
| UI 不改结构且复用 unknown 文案 | 2, 5 |
| 测试与检查矩阵 | 6 |
