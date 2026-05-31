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

## 2026-05-31 追加方案

- 运行概览改为等高 compact metric。token 指标只保留总量、分段条和横向 chips, 不再使用会把卡片撑高的竖向 legend。
- 产物面板移出右侧栏, 放在工具时间线与会话信号下方, 使用全宽区域展示文件路径、计划、待办和 checkpoints。
- Checkpoints 面板增加无明细摘要:
  - 当只有 checkpoint 总数但每项文件数都为 0 时, 只展示 “记录了 N 个 checkpoint, transcript 未包含文件明细”。
  - 当部分 checkpoint 有文件数时, 只展开有文件明细的 checkpoint, 其余无明细项折叠成一行说明。
- 工具时间线改成高密度列表:
  - 列表容器统一绘制一条纵向 rail, 每行只负责放置固定尺寸状态点。
  - 每行控制在一行主信息内: 状态、工具名、类别、摘要、时间、耗时。
  - 文件路径和长摘要使用截断与 hover title, 避免 100+ 条调用时页面过高。
- 工具耗时筛选:
  - 从当前 events 里可计算的耗时推导 slider 最大值。
  - 阈值为 0 时显示全部工具; 阈值大于 0 时只显示耗时大于等于阈值的工具调用, 无耗时事件被隐藏。
  - UI 显示 “当前显示数 / 总数” 和当前阈值。
- 工具说明:
  - 用一组本地静态分类把工具名映射到说明: shell、文件读写、搜索、Web、Agent、AskUserQuestion、Skill、task/todo、patch、MCP、browser、image、workspace、多代理、hook、通用。
  - `Agent` 提示其耗时包含子代理完整任务; `AskUserQuestion` 提示其会等待用户回答, 因此耗时可能显著变长。
