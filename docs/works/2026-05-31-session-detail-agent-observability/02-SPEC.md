# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

- 在 `SessionToolEvent` 上新增可选字段 `durationMs?: number | null`。
  - UI 优先使用 `durationMs`。
  - 没有该字段时, 用 `startedAt` / `endedAt` 相减。
  - 只有单点 timestamp 的事件返回 `null`, UI 显示占位。
- Codex parser 在 tool output payload 中读取 `metadata.duration_seconds`、`metadata.duration_ms`、`duration_seconds`、`duration_ms`。
  - 秒字段转换为毫秒。
  - 只接受有限且非负的数值。
- 不新增 IPC channel, 只扩展现有 `sessions:get` 返回数据中的可选字段。

## 模块结构 / 组件拆分

- `src/main/adapters/codex/parsers.ts`
  - 增加 `readToolOutputDurationMs()` helper。
  - 在匹配到对应 `callId` 的 output 时写入 `event.durationMs`。
- `src/shared/types/ipc.ts`
  - 扩展 `SessionToolEvent`。
- `src/renderer/src/components/shared/token-usage-display.tsx`
  - 增加可选 prop `showTextBreakdown?: boolean`, 默认 `true`。
  - `mode="detail"` 且 `showTextBreakdown={false}` 时只显示总量、分段条和 legend。
- `src/renderer/src/pages/session-detail.tsx`
  - 增加纯函数:
    - `getToolDurationMs(event)`
    - `buildSessionSignals(detail)`
    - `formatDurationMs(ms)`
    - `formatRate(...)`
  - 顶部改成 summary panel: 标题/路径/模型 + 核心指标网格。
  - 主体改成响应式两栏: 左侧工具时间线, 右侧会话信号、加载资产、产物。
  - 时间线使用一个 row-relative rail: 左列整高画线, 图标使用固定 20px 容器居中, 第一/最后一行通过遮罩避免线头外溢。
  - 每条工具事件显示状态、类别、开始时间、耗时、summary、相关文件。
- `src/renderer/src/i18n/locales/en.json` 与 `zh.json`
  - 增加会话信号、耗时、错误率、缓存读占比、费用速率等标签。

## 测试策略

- `tests/unit/codex-session-parser.test.ts`
  - 增加 output metadata duration 用例, 断言 `durationMs`。
- `tests/renderer/sessions-pages.test.tsx`
  - detail fixture 增加成功与错误工具事件。
  - 断言页面显示工具耗时、平均耗时、最慢工具、错误率、缓存读占比、token 速率。
  - 断言会话详情 token 区保留 legend, 不再重复 `Input: 10` / `Output: 5` 的顶部明细。
- 验证命令:
  - `pnpm test -- tests/unit/codex-session-parser.test.ts tests/renderer/sessions-pages.test.tsx`
  - `pnpm typecheck:web`
  - `pnpm harness:check`

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `SessionToolEvent.durationMs` 与 Codex output metadata 解析 | 3, 4, 7 |
| 会话详情页 session signals | 1, 6, 7 |
| 时间线 rail 与图标固定对齐 | 2, 6 |
| 工具事件耗时 chip 与未知占位 | 3, 7 |
| `TokenUsageDisplay.showTextBreakdown` 并只在详情页关闭重复明细 | 5, 7 |
| 响应式两栏布局与 i18n | 1, 6 |
| 目标测试、typecheck、harness | 8 |
