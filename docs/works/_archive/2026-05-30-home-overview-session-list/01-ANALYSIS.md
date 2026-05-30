# Explore Analysis

## 现状理解

首页总览没有独立的 overview 数据接口。会话列表走这条链路:

1. `src/renderer/src/pages/overview.tsx` 调 `useSessions({ limit: 5 })`。
2. `src/renderer/src/hooks/use-ipc.ts` 调 `window.api.sessions.list(...)`。
3. `src/preload/index.ts` 转发到 `sessions:list`。
4. `src/main/ipc/handlers.ts` 从 scanner cache 取 `type === 'session'` 的 asset, 按 `meta.modifiedAt` 倒序, 截断到 `limit`, 映射为 `SessionSummary`。
5. `src/main/adapters/claude-code/scanner.ts` 只扫描 `~/.claude/projects/<project>/*.jsonl` 顶层文件, 再由 `parseSessionMeta()` 解析元数据。

首页渲染层还会把已返回的 5 条 session 再按 project 分组展示。完整 `/sessions` 页也使用 `useSessions()`, 但它处理了 `loading`; 首页当前没有处理 `loading`。

用户补充指出 `/sessions` 页面也有类似共性问题。本轮重新扫描确认, 会话相关 UI 入口只有三处:

1. Overview: `src/renderer/src/pages/overview.tsx`
2. Sessions: `src/renderer/src/pages/sessions.tsx`
3. Session Detail: `src/renderer/src/pages/session-detail.tsx`

三者都消费同一个 `SessionSummary` 契约, 问题应在数据解析、IPC 映射和共享格式化层收敛, 不应只修首页。

## 本轮证据

本机只读字段抽样显示, `~/.claude/projects` 顶层 JSONL 共 21 个。最近文件的前几行常见类型是 `last-prompt`、`mode`、`permission-mode`、`bridge-session`、`attachment`、`system`、`user`、`assistant`, 不是现有 parser 期待的首行 `summary`。

字段统计:

- `MissingStartedAt = 18 / 21`
- `MissingTitle = 21 / 21`
- `MissingModel = 21 / 21`
- `MissingCost = 21 / 21`
- `MissingTokens = 21 / 21`

这说明首页列表大概率不是“取不到 session”, 而是 session asset 存在, 但解析出的标题、时间、模型、费用、token 基本为空。UI 再把空 `startedAt` 传给 `new Date()` 后, 会出现 `Invalid Date` 一类展示问题。

补充验证:

- `.claude/projects` 的目录名是编码后的项目路径, 例如 `D--Code-berth`, 不能原样作为用户可读路径展示。
- 真实 JSONL 行里存在 `cwd`, 例如 `D:\Code\berth`; 首页和会话页应优先展示这个真实路径。
- 真实 JSONL 行里存在 `ai-title.aiTitle`, 可作为比 UUID 更好的会话标题来源。
- 真实 JSONL 的 assistant 行里存在 `message.model` 和 `message.usage`, usage keys 包含 `input_tokens`、`output_tokens`、`cache_read_input_tokens`、`cache_creation_input_tokens` 等; token 为 0 的问题可以从这里修。

全量顶层 JSONL 字段统计:

- `TotalFiles = 21`
- `HasCwd = 21 / 21`
- `HasAiTitle = 12 / 21`
- `HasAnyTimestamp = 21 / 21`
- `HasUsage = 18 / 21`
- `HasNonzeroTokens = 18 / 21`
- `HasModel = 18 / 21`
- `HasCostKeys = 0 / 21`

这说明 date/path/token/model 都有真实来源, 只是现有 parser 没用到; cost/price 在 session JSONL 中没有稳定字段, 不能继续把未知价格展示成 `$0.00`。

## 用户可见字段审计

| 字段 | Overview | Sessions | Detail | 当前来源 | 问题 |
|---|---|---|---|---|---|
| title | 列表标题 | 列表标题 | 页面标题 | `s.name` / `asset.name` | parser 没读 `ai-title.aiTitle`, 大量退回 UUID |
| date | `formatRelativeTime(new Date(session.startedAt))` | 同样显示; 按 date 分组也用 `new Date(startedAt)` | `Started` 元信息同样显示 | `meta.startedAt` | parser 常给空字符串, 三个页面都会出现无效日期 |
| project/path | 列表行或分组 header | 默认按 project 分组 header | Project 元信息 | `meta.project = <encoded dir name>` | 展示 `D--Code-berth` 等编码目录名, 不是 `D:\Code\berth` |
| tokens | 列表右侧 | 列表右侧 | Tokens 元信息 | `meta.totalTokens ?? 0` | parser 没读 `message.usage`, 可读到的 session 仍显示 0 |
| cost/price | 列表右侧 `$0.00` | 列表右侧 `$0.00` | Cost 元信息 `$0.00` | `meta.totalCost ?? 0` | session JSONL 无 cost key, 0 是未知被伪装成真实价格 |
| model | 不显示 | 右侧 badge | Model 元信息 | `meta.model ?? ''` | parser 没读 `message.model`, badge 可能空壳 |
| duration | 不显示 | 列表显示 `0s` | Duration 元信息 `0s` | IPC 写死 `0` | 可以用 `endedAt - startedAt` 计算, 否则应显示未知 |
| skills/mcp/hooks | 不显示 | 不显示 | Loaded Assets 三块 | parser 未读 tool_use / hook summary, IPC 写死空数组 | 真实 JSONL 有 `Skill` tool_use、`mcp__server__tool` 和 `stop_hook_summary`, 应从数据层生成详情 |
| loading | 不处理 | 有 loading 文本 | 有 loading 文本 | hook loading | Overview 会先闪 empty state |
| error | 无 | 无 | 无 | hook catch 吞掉 | IPC 失败会被当成空结果 |
| id/link | 点击详情 | 点击详情 | URL 参数 | `makeId(Date.now + counter)` | 重扫后 id 变化, 详情链接不稳定 |

## 页面级问题

### Overview

- 使用 `useSessions({ limit: 5 })`, 但忽略 `loading`。
- 把已排序的最近 5 条再按 project 分组, 会破坏“最近会话”的时间线语义。
- date、path、tokens、cost 都直接显示坏数据。

### Sessions

- `project` 分组默认展示编码目录名, 用户会看到 `D--Code-berth`。
- date 分组调用 `getDateGroupKey(startedAt)`, `startedAt` 为空时同样产生无效日期组名。
- 行内时间同样调用 `formatRelativeTime(new Date(session.startedAt))`, 会出现无效日期。
- `duration` 固定为 `0`, 显示 `0s`。
- cost 固定兜底为 `$0.00`, tokens 固定兜底为 `0`, model 可能渲染空 badge。
- filter 只搜 `title/project/model`; 修成真实 path 后应纳入可读 path, 不能只搜编码 project。

### Session Detail

- Project 元信息展示编码目录名。
- Cost、Tokens、Duration、Started 都复用同一批坏字段。
- `Started` 文案硬编码英文, 没走 i18n。
- skills/mcp/hooks 当前全部返回空, 已经被用户确认是本轮共性问题: parser 没读 `tool_use` / hook summary, `sessions:get` 又写死空数组。
- plans/todos 没有在本轮真实 JSONL 抽样里发现稳定会话级关联字段, 默认不伪造。
- fileHistoryCount 可由 `file-history-snapshot` 记录计数, 可以顺手从 parser 填上。

## 关联与依赖

- 数据源: `parseSessionMeta()` 只读 JSONL 首行和尾部 4KB, 只对 `summary` 行做较完整字段提取; 这不适配当前真实 JSONL。
- 数据契约: `SessionSummary` 只有 `project` 字段, 没有区分 `projectPath`、`projectName`、`sessionPath`、`costKnown` 等展示需要。
- 列表接口: `sessions:list` 使用 `modifiedAt` 排序, 但 UI 展示的是 `startedAt`; 两者语义不完全一致。
- UI: 三个会话入口都没有安全格式化 date/cost/duration/model; Overview 还缺 loading/error 兜底。
- 测试: 现有测试覆盖了顶层 JSONL 被识别为 session, 但没有直接覆盖真实 Claude JSONL 结构、`useSessions()`、Overview/Sessions/Detail 的非空字段展示、排序/limit。
- 状态刷新: watcher 发 `assets:changed`, renderer 当前没有用它刷新首页会话列表。

## 风险点

1. JSONL 结构漂移是首要问题。真实文件有 `ai-title.aiTitle`、`cwd`、`user/assistant` 时间戳、`assistant.message.usage` 等字段; 现有 parser 没读这些路径。
2. session id 由 `makeId(Date.now + counter)` 生成, 重新扫描会变化; 首页跳详情页的 URL 不稳定。
3. 首页把最近 5 条再按 project 分组, 会改变全局最近顺序。
4. 首页忽略 `loading`, 初始空数组会直接显示 empty state, 加载慢时会闪空态。
5. `startedAt` 为空时没有兜底, 会展示无效日期。
6. project/path 用 `.claude/projects/<encoded>` 目录名原样展示, 例如 `D--Code-berth`; 正确展示应优先使用 JSONL `cwd`, 或至少把编码目录名解回平台路径。
7. token 和 price 全为 0 的表现来自 parser 没读取真实 usage/cost 字段; token 可从 `assistant.message.usage` 累加, price 需要确认是否有稳定 cost 字段, 没有时不应伪造。
8. project 为空时, 多组 header 显示硬编码 `Unknown`, 单组行内却显示空白。
9. `preload.assets.scan` 指向 `assets:scan`, main/shared 是 `assets:scan-category`; 不直接影响本问题, 但说明 IPC 命名有漂移。
10. Sessions 和 Detail 页面复用同一批坏字段, 若只改 Overview 会留下明显不一致。
11. Detail 的 skills/mcp/hooks 空值不是 UI 问题, 而是 parser 和 `sessions:get` 两层都没有生成关联数据。

## 验收标准

1. Overview、Sessions、Session Detail 三个入口都基于真实 Claude 顶层 JSONL 展示可读标题或合理兜底标题。
2. 三个入口的时间展示有效; 缺失 `startedAt` 时有明确 fallback, 不出现 `Invalid Date` 或无效日期分组。
3. 三个入口的路径/项目展示为用户可读路径, 例如 `D:\Code\berth`, 不展示 `D--Code-berth` 这类编码目录名。
4. token 不再无依据地全部为 0; 对能从 `assistant.message.usage` 读出的 session, 列表和详情显示真实累计 token。
5. price/cost 如果有稳定字段则展示真实值; 如果 session JSONL 没有稳定 cost 字段, UI 不应把未知成本伪装成 `$0.00`。
6. duration 如果能由 `startedAt/endedAt` 计算则显示真实持续时间; 否则显示未知, 不显示误导性的 `0s`。
7. Overview 最近列表保持全局最近顺序, 不因 project 分组改变排序。
8. Sessions 的 project 分组、filter、date 分组都基于安全格式化后的字段。
9. `sessions:list({ limit: 5 })` 返回稳定 id, 同一 JSONL 重扫后详情链接仍可用。
10. 加载中不显示空态; 真实为空时才显示空态; IPC 失败不被静默伪装成空结果。
11. 单元测试覆盖真实 JSONL 结构下的 session metadata 解析, 包括 `last-prompt` 前置行、`ai-title.aiTitle`、`cwd`、`assistant.message.usage`、无 cost 字段。
12. renderer 测试覆盖 Overview、Sessions、Session Detail 的非空列表/详情、无效时间兜底、路径展示、token/cost 未知态。
13. Session Detail 能显示 transcript 中实际调用过的 Skill、MCP server 和 hook fired count; 没有配置资产时也用 session 级合成资产展示名称, 不再空白。
14. 最终通过 `pnpm typecheck` 和相关 Vitest; 若触及 e2e, 先 `pnpm build` 再跑目标 Playwright。

## 未决问题

- 首页 Recent Sessions 是否应完全取消 project 分组, 改为严格一条时间线? 从“最近会话”语义看建议取消分组。
- 是否把嵌套 sidechain/subagent JSONL 也纳入首页列表? 当前 v0.1 注释明确只扫顶层主会话; 本轮默认不扩大范围。
- cost 是否展示未知态还是隐藏? 本轮实测 session JSONL 无 cost key; stats-cache 有模型级总 cost, 但不能可靠分摊到单个 session。默认建议 session 级 cost 显示 `—` / unknown, 不做伪造分摊。
- Detail 页的 skills/mcp/hooks 已纳入本轮; plans/todos 没有稳定 transcript 字段, 不在本轮伪造。
