# 需求分析 (Explore 产物)

## 现状理解

当前链路集中在主进程 metric 生成和 renderer 展示:

1. `src/main/ipc/handlers.ts` 的 `sessions:get` 从 asset runtime 读取 session asset, 用 `toSessionSummary(asset)` 生成 summary, 再用 `toSessionActivityMetrics(summary, asset)` 生成 `activityMetrics`。
2. `toSessionActivityMetrics()` 读取 `asset.meta.usageStartedAt` / `usageEndedAt` / `usageDuration`; 当 `durationSeconds > 0` 且 total tokens 大于 0 时, 直接计算 `totalTokens / (durationSeconds / 60)`。
3. Claude parser 和 Codex parser 都会写 `usageStartedAt` / `usageEndedAt` / `usageDuration`。这些时间戳来自日志里的 usage 或 token_count 事件时间, 不是模型真实生成耗时。
4. `src/renderer/src/pages/session-detail.tsx` 的 `buildSessionSignals()` 已经改为使用 `detail.activityMetrics.tokenRatePerMinute`, 页面只负责把数字格式化为 `tok/min`, 不再自己用 `summary.duration` 计算。
5. 因此离谱值的直接原因是: 主进程把很短的 usage/token_count 事件时间差当成可信分钟级分母, 再把总 token 外推成每分钟速率。例如一秒窗口里有 11050 token, 会显示约 663000 tok/min。

## 关联与依赖

- `SessionActivityMetrics` 是 `src/shared/types/ipc.ts` 的 IPC 契约; 现有字段已经能表达 `usage-events` 和 `unavailable`, 本次不需要改类型。
- `sessions.signals.tokenRateSourceUnavailable` 已有英文和中文文案, 可用于过短或缺失的时间数据。
- `tests/renderer/sessions-pages.test.tsx` 已覆盖 renderer 在 `activityMetrics.tokenRatePerMinute=null` 时显示 `—` 和原因文案; 本次应补主进程 metric 的回归测试, 不只测 UI。
- `pnpm harness:stats` 输出 debt total=17/status=ok, 当前非维护 bug 可以继续。

## 任务分类与 debt 校准

- type / maintenance.subtype: `bug`
- source.kind / refs: `user-request`, `https://github.com/Caldis/berth/issues/95`
- debt estimate 修正: confidence 从 `low` 调整到 `medium`; scope/risk/net 不变。
- scope / risk / areas / confidence: `module / medium / ui-ux,testability / medium`
- revision: 已写入 `INDEX.md debt.revisions[]`。

## 验收标准

1. `sessions:get` 的 token rate 不应在 usage/token_count 时间窗口过短时返回巨大外推值。
2. 过短或缺失时间窗口应通过现有 `unavailable` source 表示, renderer 继续显示 `—` 和“时间数据不足”类短文案。
3. 足够长且有 token 的 usage 时间窗口仍应正常返回 `usage-events` 和 `tok/min` 数值。
4. `SessionActivityMetrics` IPC 字段不新增、不改名, 现有 renderer 和 preload 契约不退化。
5. 会话详情页 Overview 的信息层级不变; Token 速率仍在 Session signals 中, 不新增大段说明。
6. 目标 unit/renderer 测试、node/web typecheck 和 harness 检查通过。

## 界面质量与交互验收

页面结构不需要改。现有 Session Detail Overview 使用 summary card、Session signals 网格和 Loaded Assets 区域; Token 速率只是 signals 里的辅助指标。本次修复应保持:

- 布局层级: 不新增说明卡, 不移动指标位置。
- 信息密度: 有可靠速率时继续显示 `N tok/min`; 不可靠时显示 `—` 和短原因。
- 组件一致性: 继续使用现有 `SignalMetric` 和 i18n 文案。
- 可见状态: 覆盖有可靠 usage duration、过短 usage duration、无 usage duration。
- 响应式/可访问性: 不改 tab、button、focus 和小屏布局。

## 未决问题

无。设计可按“主进程 activity metric 对过短 usage 窗口返回 unavailable”推进。
