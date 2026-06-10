# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号 (AC1–AC9)。

用户澄清结论 (2026-06-11):
- 重放**替换**现有 timeline tab (overview/artifacts 保留) → AC4
- 列表页形态授权 Agent 自主, verify 截图阶段用户裁决 → AC1/AC2/AC9
- 详情页 tab 用 HeroUI Tabs **solid 分段式 + 每个 tab 带图标** → AC3
- 用户指令: 自主完成全流程, 完成后推送远端。

## 数据契约 (AC4/AC5/AC6)

实证依据: 本机最大 Claude transcript 59MB (`C--Users-mail/7ef9837f….jsonl`); 记录类型实测含 `user / assistant / system / file-history-snapshot / attachment / last-prompt / ai-title / permission-mode / bridge-session`; `user.message.content` 可为**标量字符串**或块数组; assistant 块类型 `thinking|text|tool_use`; `message.usage` 含 `input_tokens/output_tokens/cache_read_input_tokens/cache_creation_input_tokens`; 多数记录带 `timestamp`+`uuid`+`isSidechain`, 纯 meta 类型 (last-prompt 等) 无 timestamp。

### 新类型 (src/shared/types/ipc.ts)

```ts
type SessionReplayEventKind = 'user' | 'assistant' | 'thinking' | 'tool' | 'result' | 'model' | 'system'

interface SessionReplayTokens { input?: number; output?: number; cacheRead?: number; cacheCreation?: number }

interface SessionReplayEvent {
  id: string                  // L{lineIdx}B{blockIdx}, 解析器内部约定, payload 反查靠它
  kind: SessionReplayEventKind
  timestamp: string | null    // ISO8601, 记录级
  summary: string             // 单行摘要 ≤160 字符 (正文截断, 去换行)
  toolName?: string           // kind=tool/result
  status?: 'success' | 'error' // kind=tool/result
  tokens?: SessionReplayTokens // kind=model (per assistant 记录 usage)
  sidechain?: boolean         // Claude isSidechain (subagent 线程)
}

interface SessionReplayResult {
  sessionId: string
  agentId: string
  startedAt: string | null
  endedAt: string | null
  events: SessionReplayEvent[]   // 截断后
  totalEvents: number            // 截断前真实数
  truncated: boolean             // 超过 REPLAY_EVENT_CAP=20000 时取最近 20000 条
}

interface SessionReplayEventPayload { id: string; json: string } // 原始 JSONL 行
```

### IPC 通道 (四方同批: IpcChannels + preload + handlers + tests/setup.ts mock)

- `sessions:events`: `[sessionId: string]` → `SessionReplayResult | null`
- `sessions:event-payload`: `[sessionId: string, eventId: string]` → `SessionReplayEventPayload | null`

payload 按需取 (选中事件时), 避免 59MB 级 transcript 正文全量过 IPC; 事件 meta 单条 ~200B, 20k cap 上限 ~4MB。

### 事件映射

Claude (`adapters/claude-code/session-replay.ts`, 新):
- `user` 记录: content 标量/text 块 → `user`; content 内 `tool_result` 块 → `result` (按 tool_use_id 回填 toolName/status, is_error→error)
- `assistant` 记录: 逐块 `thinking`→`thinking`, `text`→`assistant`, `tool_use`→`tool`; 记录含 `message.usage` 时额外发一条 `model` 事件 (tokens)
- `system` 记录 + `stop_hook_summary` → `system`; `file-history-snapshot` → `system` (checkpoint, ts=null)
- 跳过纯 meta: `last-prompt / ai-title / permission-mode / bridge-session / attachment`; 未知类型跳过不抛错
- `isSidechain` → `sidechain: true`

Codex (`adapters/codex/session-replay.ts`, 新, 类型清单对齐现有 parseCodexSessionDetail):
- `response_item` payload.type: `message` role user/assistant → `user`/`assistant`; `reasoning` → `thinking`; `function_call|custom_tool_call|local_shell_call|web_search_call|tool_search_call` → `tool`; `*_output` → `result` (call_id 配对)
- `event_msg` payloadType `token_count` → `model`; 其余有信息量的 (`patch_apply_end` 等沿用现有清单) → `system`
- `session_meta`/`turn_context` → 跳过 (已在 summary 层)

### Engine (engine/session-replay.ts, 新; 归入 ARCHITECTURE 既有例外行 "engine→adapters 直连 (session 解析)")

- `buildSessionReplay(asset)`: 模块级 `AssetFileCache<ParsedSessionReplay>` 按 `asset.path` 指纹缓存解析结果 (path+size+mtimeMs); per-agent 分发同 session-detail 模式
- `readSessionReplayEventPayload(asset, eventId)`: 从 eventId 解出 lineIdx → readFileSync + split 取该行返回 (一次点击 ~50ms@59MB, 可接受; 不缓存全文避免主进程内存膨胀)
- **repaid**: `engine/session-detail.ts` 的 `parseSessionExecutionDetail` 同批接独立 `AssetFileCache` (AC6, 重复打开同会话不再重复解析)
- 已知限制 (不在本任务): 首次解析仍在主进程主线程 (renderer 异步等待不卡 UI, 但 main 短暂忙); worker 下沉记 docs/issues

### Renderer hook (hooks/use-ipc.ts)

- `useSessionReplay(sessionId)`: CachedResource (TTL 60s, 签名比对), 返回 `{ replay, loading, error, reload }`; 挂载于 replay tab 面板 (惰性, 不打开不解析)
- payload 取数: 组件内 `Map<eventId, json>` 缓存 + in-flight 去重

## 任务分类与 debt

- type: feature; source.kind: user-request; refs: GH-116
- debt.estimate: 维持 explore 校准值 (incurred 8 / repaid 3 / net 5 / cross-process / medium / [ui-ux] / confidence medium); design 无新增修正 → 不加 revision
- debt.final 预期: 与 estimate 持平; verify 后按实回填
- harness:stats 总 debt 13 (ok), 无需 override
- Project 字段同步: ensure 已写 PVTI_lAHOADXbEs4BZHvQzgvVVog; archive 时 done 同步 final

## 模块结构 / 组件拆分

新增:
- `src/main/adapters/claude-code/session-replay.ts` + `src/main/adapters/codex/session-replay.ts` — per-agent 解析 (adapters 层, 只依赖 _shared/shared)
- `src/main/engine/session-replay.ts` — 编排 + 缓存 + payload 读取
- `src/renderer/src/components/sessions/session-replay.tsx` — 重放视图编排 (过滤态/选中态由 session-detail 页持有以跨 tab 存活)
- `src/renderer/src/components/sessions/replay-scrubber.tsx` — 时间轴刷子 (自绘: 轨道 + 事件刻度 + 拖拽手柄; role=slider, ←/→ 步进; 事件 >1500 时刻度抽样渲染)
- `src/renderer/src/components/sessions/replay-detail-panel.tsx` — 选中事件详情 (徽章+时间+id+payload JSON 高亮)
- `src/renderer/src/components/sessions/session-row.tsx` — 列表行 (自 sessions.tsx 抽出重设计)
- `src/renderer/src/components/sessions/session-filter-bar.tsx` — 结构化筛选条
- `src/renderer/src/lib/replay-model.ts` — 纯逻辑: 过滤/最近事件定位/位置归一 (无时间戳回退索引比例)/offset 格式化 (h:mm:ss)
- `src/renderer/src/lib/json-highlight.ts` — 纯 JSON 词法着色 (token 数组, 无依赖)
- `src/renderer/src/lib/session-list-filters.ts` — 纯逻辑: agent/model 过滤 + 排序 + 日期分桶 (today/yesterday/thisWeek/thisMonth/earlier, 注入 now 可测)

修改:
- `src/shared/types/ipc.ts` (类型+通道) / `src/preload/index.ts` (sessions.events/eventPayload) / `src/main/ipc/handlers.ts` (session 域两薄 handler) / `tests/setup.ts` (mock 键)
- `src/main/engine/session-detail.ts` (detail 解析接缓存)
- `src/renderer/src/pages/session-detail.tsx`: Tabs 改 solid 原生 (variant solid + cursor 动画 + 图标 title); 删 ToolTimeline/duration slider/ToolTipButton/getToolTipKey 等 (~350 行); timeline tab → replay tab; signals/overview/artifacts 不动 (signals 仍消费 sessions:get 的 toolTimeline)
- `src/renderer/src/pages/sessions.tsx`: 接 filter bar + 分组扩展 (project/date/none) + 行组件抽出; jump nav 在 none 模式隐藏
- `src/renderer/src/styles/globals.css`: 删 `.duration-filter-range` 块
- i18n en/zh: 新增 `sessions.replay.*`, `sessions.filters.*`, `sessions.dateBuckets.*`, `sessions.tabs.replay*`; 删除 `sessions.toolTimeline*`, `sessions.toolFilter.*`, `sessions.toolTips.*`, `sessions.tabs.timeline*` (删除纪律: 同批清 key)
- `docs/ARCHITECTURE.md`: engine 模块行补 session-replay; 例外行 "engine→adapters 直连 (session 解析)" 补 replay 解析

明确不做 (范围控制):
- ModelBadge / SignalMetric 手写 hover-popover 迁 HeroUI Tooltip → 记 docs/issues (AC 外, 测试 churn 大)
- 重放分块流式 IPC / worker 解析下沉 → 记 docs/issues (cap+缓存已满足 AC6)
- 列表 URL querystring 筛选持久化 → 不做 (无既有先例)

## 界面质量与交互验收 (AC1/AC2/AC3/AC4/AC7/AC8/AC9)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 列表页: 页头(标题+搜索) → 筛选条(agent Tabs+model Select+排序 Select+分组 Tabs+结果计数) → 跳转导航+虚拟列表; 行改两行制 (~64px): 行1 标题+agent chip+cost+TokenSparkBar, 行2 时间·时长·模型·skills/mcp 计数 (非项目分组时附项目名)。详情 replay tab: 控制行(类型多选+搜索+计数) → scrubber → 左事件流(虚拟)+右详情面板 420px | 真机截图 (electron 实测窗口坐标) 亮/暗主题各一; 用户裁决主观项 — 本任务用户已授权自主完成, Agent 自验并留档截图 |
| 组件选择 / 一致性 | 全部经 `@/components/ui`: Tabs(solid)/Select/Input/Chip/Tooltip/Spinner/ScrollShadow; 事件 kind 徽章用 Chip 五 tone (user=primary, assistant=success, thinking=warning, error result=danger, 余 neutral); 图标 lucide 与现有一致 | 代码审查 + 截图; 不直接 import @heroui/react |
| 交互反馈 | 行/事件 hover bg-default-100; 选中事件 bg-primary/10+边框; scrubber 拖拽实时同步列表滚动与选中; tab 切换 cursor 滑动动画; 过滤即时生效带计数 | 真机交互实测 (CDP/playwright): 点选事件→详情面板出现且 payload 加载; 拖 scrubber→列表滚动 |
| loading/empty/error/disabled/focus | replay: 事件加载 skeleton/spinner, payload 面板独立 loading, 解析错误 ErrorState+retry, 0 事件 EmptyState, truncated 提示 chip; 列表: 既有四态保留 + 筛选无结果态 (区分空库) | renderer 测试逐态断言 + 真机抽查 |
| 响应式 / 可访问性 / 键盘 | <lg: 详情面板改下方抽屉式叠层或收起 (实现取折叠: 选中后面板以 overlay 出现); 列表行右列逐级隐藏; Tabs 键盘←/→ (HeroUI 自带); 事件列表 ↑/↓ 移动选中 (listbox 语义 aria-selected); scrubber role=slider + aria-valuetext; 详情面板可关闭 (Esc/按钮) | renderer 测试 (键盘事件) + 真机 Tab 序抽查 |
| 文案 / i18n / 格式 | en/zh 对称新增; 时间偏移 h:mm:ss (formatOffset); token 数 formatNumber; 路径 truncatePath; 相对时间沿用 formatOptionalRelativeTime | i18n key 对称性由现有 i18n 测试/或新断言覆盖; zh 文案人工复核 |

## 测试策略 (AC5/AC8)

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Claude replay 解析 (标量/块 content、thinking、tool 配对、usage→model 事件、sidechain、meta 跳过、截断 cap) | unit | tests/unit/session-replay-claude.test.ts (新) | pnpm vitest run tests/unit/session-replay-claude.test.ts | — |
| Codex replay 解析 (message/reasoning/工具族/token_count) | unit | tests/unit/session-replay-codex.test.ts (新) | pnpm vitest run tests/unit/session-replay-codex.test.ts | — |
| engine 编排: 指纹缓存命中不重解析、payload 行反查、坏 id→null、文件消失安全 | unit | tests/unit/session-replay-engine.test.ts (新) | pnpm vitest run tests/unit/session-replay-engine.test.ts | — |
| detail 解析缓存 (repaid) | unit | tests/unit/session-detail.test.ts (扩展) | pnpm vitest run tests/unit/session-detail.test.ts | — |
| IPC 四方对账 (新两通道) | unit | tests/unit/ipc-contract.test.ts + ipc-registration.test.ts (现有自动强制) | pnpm vitest run tests/unit/ipc-contract.test.ts tests/unit/ipc-registration.test.ts | — |
| 列表过滤/排序/日期分桶纯逻辑 | renderer | tests/renderer/session-list-filters.test.ts (新) | pnpm vitest run tests/renderer/session-list-filters.test.ts | — |
| replay-model 纯逻辑 (过滤/定位/offset 格式) + json-highlight | renderer | tests/renderer/replay-model.test.ts (新) | pnpm vitest run tests/renderer/replay-model.test.ts | — |
| scrubber 交互 (点击轨道选中最近事件、←/→ 步进、aria) | renderer | tests/renderer/replay-scrubber.test.tsx (新) | pnpm vitest run tests/renderer/replay-scrubber.test.tsx | — |
| 列表页: 筛选条交互、两行行渲染、分组三模式、无结果态 | renderer | tests/renderer/sessions-pages.test.tsx (更新) | pnpm vitest run tests/renderer/sessions-pages.test.tsx | — |
| 详情页: solid tabs (图标+计数)、replay tab 事件渲染/选中/详情面板/类型过滤/搜索 | renderer | tests/renderer/sessions-pages.test.tsx (更新) | 同上 | — |
| 视觉/主观布局/组合时序 (真实 transcript 重放) | manual + CDP | 4.0-verify: 真机截图 (实测窗口坐标) + playwright/CDP 交互观察 | pnpm dev + CDP | 主观 taste 与组合时序无法静态断言 (friction 20260609) |
| 全量门禁 | harness | — | pnpm harness:prepush | — |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 筛选条 (agent/model/排序/分组/计数/清除=回到 all) | AC1 |
| 分组虚拟列表保留 + none 平铺 + 两行行重设计 | AC2, AC7 |
| Tabs solid 原生 + 图标 + cursor 动画 + 键盘 | AC3 |
| Replay 视图 (事件流+kind 徽章+offset 时间+详情面板+scrubber+过滤+搜索) | AC4 |
| 两通道 IPC + 四方对账 + 双 agent 解析 | AC5 |
| 20k cap + AssetFileCache (replay+detail) + payload 按需 + 虚拟化 | AC6 |
| overview/artifacts 保留; 行字段全保留 | AC7 |
| 状态全覆盖 + i18n 对称 + 测试更新 + prepush | AC8 |
| 截图/交互真机验收 | AC9 |

## 执行顺序 (并行边界)

T1→T2→T3→T4 顺序 (同链路纵向依赖, T1/T2 虽不同文件但共享 shared 类型首次落地于 T1); T5 依赖 T4; T6/T7 同文件 (session-detail.tsx) 顺序; T8 (sessions.tsx) 与 T6/T7 文件不重叠但共享 i18n json 与 sessions-pages.test.tsx → 顺序执行避免冲突; T9 文档收尾。主 session 顺序推进, 不并行 subagent (i18n/测试文件交叠 + 用户其他 Agent 共享工作区, 降低冲突面)。
