# Design Spec

## 依据

本设计基于 `01-ANALYSIS.md` 的 13 条验收标准, 并补充 Anthropic / Claude Code 官方文档边界:

- Hooks 输入的通用字段包含 `session_id`、`transcript_path`、`cwd`, 且 transcript 路径形如 `~/.claude/projects/.../*.jsonl`。
- Status line 输入明确包含 `cwd`、`workspace.current_dir`、`workspace.project_dir`、`model.id`、`model.display_name`、`cost.total_cost_usd`、`cost.total_duration_ms`、`context_window.*`、`session_id`、`transcript_path`。
- Cost 文档说明 `/usage` 的 dollar figure 是基于 token count 的本地估算, 可能不同于实际账单; 正式 billing 应看 Claude Console。
- Monitoring 文档暴露了 `input_tokens`、`output_tokens`、`cache_read_tokens`、`cache_creation_tokens` 等 token 维度, 说明 token 适合被分项累加; cost 则是独立指标或本地估算, 不能从缺失字段中凭空推出。
- Claude Code MCP 工具名按 `mcp__<server>__<tool>` 形式暴露; transcript 中的 tool_use 可据此提取会话用过的 MCP server。
- Hooks 官方事件包含 `Stop` 等生命周期事件; 本机 transcript 中的 `stop_hook_summary` 只能稳定得出 Stop hook 的触发次数, 不应伪造更细的事件名。

结论: `cwd` / workspace path、session id、transcript path、model、tokens、Skill tool_use、MCP tool_use、Stop hook count 是可读或可推导字段; session 级 cost 如果 transcript 没有字段, 应显示 unknown, 不显示 `$0.00`。

## 数据契约

扩展 `SessionSummary`:

```ts
interface SessionSummary {
  id: string
  title: string
  project: string
  projectPath: string
  transcriptPath: string
  startedAt: string | null
  endedAt: string | null
  duration: number | null
  cost: number | null
  tokens: number
  model: string
  skillsUsed: string[]
  mcpServers: string[]
  hooksFired: number
}
```

字段规则:

- `id`: 使用 transcript/session UUID 的稳定值, 优先 JSONL `sessionId`, 其次文件名 stem。
- `title`: 优先 `ai-title.aiTitle`, 其次 legacy `summary/title`, 再其次第一条用户 prompt 的安全截断摘要, 最后 `Session <short-id>`。
- `projectPath`: 优先 JSONL `workspace.project_dir` 或 `cwd`, 其次从 encoded project dir 尽力解码。
- `project`: 从 `projectPath` basename 派生, 用于紧凑 UI; 需要完整路径时展示 `projectPath`。
- `transcriptPath`: JSONL 文件绝对路径。
- `startedAt`: 第一条带 timestamp 的记录。
- `endedAt`: 最后一条带 timestamp 的记录。
- `duration`: `endedAt - startedAt`, 无法计算则 `null`。
- `tokens`: 累加 assistant `message.usage` 中 `input_tokens`、`output_tokens`、`cache_read_input_tokens`、`cache_creation_input_tokens`; 没有 usage 时为 0, UI 显示 unknown 或 `0` 取决于是否存在 usage source。
- `cost`: 只有 transcript 或未来显式采集字段存在时填数字; 当前没有稳定字段时为 `null`。
- `model`: 优先 `message.model`, 其次 legacy `model`, 空时显示 unknown。
- `skillsUsed`: 从 `tool_use.name === "Skill"` 的 `input.skill` 提取。
- `mcpServers`: 从 `tool_use.name` 的 `mcp__<server>__<tool>` 提取 `<server>`。
- `hooksFired`: 从 `system` / `stop_hook_summary` 的 `hookCount` 或 `hookInfos.length` 提取。

## 解析策略

`parseSessionMeta()` 不再只读首行和尾部 4KB。改为流式逐行读取 JSONL, 只提取元信息, 不保存完整消息正文到 asset:

- 扫描所有行, 忽略 malformed line。
- 维护 `firstTimestamp` / `lastTimestamp`。
- 捕获第一个真实 `cwd`; 若将来出现 `workspace.project_dir`, 优先级高于 `cwd`。
- 捕获最新或第一个 `aiTitle`。
- 捕获 `message.model`。
- 累加 `message.usage` token 字段。
- 遍历 assistant `message.content` 中的 `tool_use`, 提取 Skill 和 MCP server 名。
- 读取 `stop_hook_summary` 的 hook count, 记录到 `hookEventCounts.Stop`。
- 统计 `file-history-snapshot` 数量, 作为详情页 file history count。
- 捕获 legacy `summary/title/costUSD/cost/totalTokens` 以兼容旧样本。

隐私边界: 不把 prompt 内容、assistant 内容、tool input/output 写入 `Asset.raw` 或 `meta`。如果用第一条 user prompt 做标题兜底, 只保存短摘要, 并在实现中限制长度。

## IPC 映射

在 `src/main/ipc/handlers.ts` 提取共享映射函数, 保证 `sessions:list` 和 `sessions:get` 使用同一个转换:

- `toSessionSummary(asset): SessionSummary`
- 排序使用 `endedAt ?? startedAt ?? modifiedAt`, 倒序。
- `projectFilter` 同时匹配 `project`、`projectPath` 和 encoded project dir。
- `sessions:get` 继续返回同一 summary, 不重复写一份映射逻辑。
- `sessions:get` 的 `skillsUsed` / `mcpServers` 由 summary 中的名称解析到已扫描的真实资产; 找不到对应配置资产时, 生成 `scope: session` 的轻量合成资产, 让详情页仍能说明 transcript 实际用过什么。
- `sessions:get` 的 `hooksFired` 从 `hookEventCounts` 输出 `{ event, count }[]`; 当前 Stop hook summary 只输出 `Stop`。

## UI 格式化

新增或扩展共享 formatter, 三个页面统一使用:

- `formatOptionalRelativeTime(value)`: null/invalid 返回 `—`, 不返回 `Invalid Date`。
- `formatOptionalDuration(seconds)`: null 返回 `—`, 0 只有真实 duration 为 0 时才显示。
- `formatOptionalCurrency(value)`: null 返回 `—`, 数字 0 才显示 `$0.00`。
- `formatOptionalModel(value)`: 空返回 `Unknown` / 对应 i18n。
- `formatProjectPath(path)`: Windows 和 POSIX 都保留可读路径, 长路径用现有 `truncatePath`。

页面策略:

- Overview: 取消 Recent Sessions 的 project 分组, 保持全局最近时间线; 使用 loading 状态。
- Sessions: 默认 project 分组使用 `projectPath` 或 `project` 的安全展示; date 分组对 unknown date 放进 unknown group; filter 匹配 title/model/project/projectPath。
- Session Detail: Project 显示真实路径; Started/Duration/Cost/Tokens/Model 全部走同一 formatter; `Started` 加 i18n key。

## 测试策略

单元测试:

- `parseSessionMeta()` 覆盖真实结构: `last-prompt` 前置行、`ai-title.aiTitle`、`cwd`、`assistant.message.usage`、无 cost 字段、malformed line。
- `parseSessionMeta()` 覆盖 `Skill` tool_use、`mcp__server__tool` 和 `stop_hook_summary`。
- stable id: 同一文件重复 parse 得到同一 `id`。
- duration: started/ended 可计算; 缺失时为 null。
- mapping: `toSessionSummary()` 对 list/get 一致。
- formatter: invalid date/null cost/null duration 不渲染误导值。

Renderer 测试:

- Overview 非空列表: 调用 `limit: 5`, 显示真实路径/token, cost unknown, 不分组改序。
- Sessions: project 分组不显示 encoded dir; date unknown 不显示 invalid; filter 能搜真实路径。
- Session Detail: 元信息展示真实路径和 unknown cost。

验证命令:

```powershell
pnpm test -- tests/unit/claude-scanner.test.ts tests/unit/parsers.test.ts tests/unit/utils.test.ts
pnpm test -- tests/renderer/overview.test.tsx tests/renderer/sessions.test.tsx tests/renderer/session-detail.test.tsx
pnpm typecheck
```

若触及 e2e 或视觉验收, 先 `pnpm build`, 再跑目标 Playwright。
