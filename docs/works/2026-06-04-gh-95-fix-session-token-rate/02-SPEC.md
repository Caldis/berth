# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

扩展 `SessionActivityMetrics` 字段, 让 renderer 可以透明展示公式:

```ts
type SessionTokenRateSource = 'activity-window' | 'unavailable'

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
- 计算口径: `tokenRatePerMinute = 最近活动窗口 token 数 / (窗口秒数 / 60)`。
- 活动窗口来自 session raw 日志里的 usage/token_count 样本。相邻样本间隔大于 `30 分钟` 时切分窗口, 只展示最近一个窗口, 隔夜或长时间空闲不进入分母。
- 最低计算条件: 最近窗口至少 2 个样本、窗口时长 >= 60 秒、token 数 > 0。否则返回 `tokenRatePerMinute: null` 与 `tokenRateSource: 'unavailable'`。
- Claude `message.usage` 按窗口内 usage 事件 token 总和计算。Codex `token_count` 优先使用 `last_token_usage`; 没有增量字段时, 使用同一窗口内相邻累计值差值。
- `tokenRateTokenCount`, `tokenRateDurationSeconds`, `tokenRateStartedAt`, `tokenRateEndedAt`, `tokenRateSampleCount`, `tokenRateIdleGapSeconds` 供 hover 公式展示使用。

## 任务分类与 debt

- type / maintenance.subtype: `bug`
- source.kind / refs: `user-request`, `https://github.com/Caldis/berth/issues/95`
- debt.estimate: `incurred=4 / repaid=0 / net=4 / scope=module / risk=medium / areas=ui-ux,testability / confidence=medium`
- debt.final 预期: verify 填写。
- revisions: explore 已将 confidence 从 low 调整为 medium。
- Project 字段同步: 已通过 `node scripts/harness-projects.mjs ensure docs/works/2026-06-04-gh-95-fix-session-token-rate` 回写真实 item id。

## 模块结构 / 组件拆分

- `src/main/ipc/session-activity.ts` 放置 `toSessionActivityMetrics()`、raw usage 样本解析、最近活动窗口选择和最小 duration / idle gap 阈值。
- `src/main/ipc/handlers.ts` 在 `sessions:get` 读取当前 session transcript raw, 只传给 activity metrics, 不把 raw 放入 session list asset。
- `src/shared/types/ipc.ts` 扩展公式透明字段。
- `src/renderer/src/pages/session-detail.tsx` 继续使用 `SignalMetric`, 但为 token 消耗速率增加 hover/focus explanation popover。
- `tests/unit/session-activity.test.ts` 覆盖过短窗口、可靠窗口、缺少 token、长期会话 gap 分段。
- `tests/renderer/sessions-pages.test.tsx` 覆盖改名、source 文案和 hover 公式内容。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 Session Detail 网格层级; token 消耗速率仍在 Session signals 内, hover 层只在指标内出现 | renderer 测试 + UI 验收确认不新增常驻大段说明 |
| 组件选择 / 设计系统一致性 | 继续使用 `SignalMetric`, 在指标右上提供 `Info` hover/focus 说明 | renderer 测试覆盖说明内容, focus 可达 |
| 交互反馈 / 状态切换 | reliable 显示 `tok/min`; unreliable 显示 `—`; hover 显示公式、窗口、样本数和 idle gap 规则 | unit 测主进程 source/rate, renderer 测公式内容 |
| loading / empty / error / disabled / focus | 本次不改加载、空态、错误态、禁用或 focus | renderer 目标测试不退化 |
| 响应式 / 可访问性 / 键盘可达 | 不改 tab、折叠区和焦点结构 | 不需要额外 UI 改动 |
| 文案 / i18n / 数字和路径格式 | 改名为 `Token consumption rate` / `Token 消耗速率`; source 为最近活动窗口; hover 明确本地估算 | i18n/typecheck + renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 过短 usage 窗口不返回 token rate | unit | `tests/unit/session-activity.test.ts` | `pnpm vitest run tests/unit/session-activity.test.ts` | 不适用 |
| 可靠 usage 窗口返回 activity-window rate 和公式字段 | unit | `tests/unit/session-activity.test.ts` | `pnpm vitest run tests/unit/session-activity.test.ts` | 不适用 |
| 隔夜/长空闲会话只使用最近活动窗口 | unit | `tests/unit/session-activity.test.ts` | `pnpm vitest run tests/unit/session-activity.test.ts` | 不适用 |
| Session Detail 改名、unknown 状态和 hover 公式透明 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| 类型与 harness 任务态有效 | typecheck/harness | node/web/harness | `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-95-fix-session-token-rate` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 最近活动窗口与最小样本 gate | 1, 2, 3 |
| IPC 扩展公式透明字段 | 4 |
| UI 改名并通过 hover 展示公式 | 2, 5 |
| 测试与检查矩阵 | 6 |
