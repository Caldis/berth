# 01-ANALYSIS — Explore 产物 (经代码核实)

## issue 路径全过时 (GH-121 已迁 scan-engine 包)
issue / 00-PRD 点名的 `src/main/adapters/claude-code/parsers.ts:723` + `src/main/engine/session-replay.ts` **均不存在**; 会话解析 GH-121 整体迁入 `packages/berth-scan-engine/`。src/main 下只剩 scan-helper / helper-host / ipc/handlers 薄壳。

## 6 个全量读取点 (全 readFileSync + split, 全同步)
| # | 函数 | 文件 | 进程 | 触发 |
|---|---|---|---|---|
| 1 | parseSessionMeta (claude) | adapters/claude-code/parsers.ts:686 | **worker** | 扫描 |
| 2 | parseCodexSessionMeta | adapters/codex/parsers.ts (readJsonLines:670) | **worker** | 扫描 (物化 Record[]) |
| 3 | parseClaudeSessionDetail | adapters/claude-code/session-detail.ts:42 | **主进程** | 点开会话 |
| 4 | parseCodexSessionDetail | adapters/codex/parsers.ts:561 | **主进程** | 点开会话 |
| 5 | parseClaude/CodexSessionReplay | adapters/*/session-replay.ts:30 | **主进程** | replay 视图 |
| 6 ⭐ | readSessionReplayEventPayload | engine/session-replay.ts:47 | **主进程** | **每点击事件整文件读取一行** (无缓存, 单点最大收益) |

## worker 边界反转 (issue 不准)
issue 说"scan worker 已有边界"对 meta (#1/#2, 已在 worker) 成立; 但真正卡主线程的 #3/#4/#5/#6 走 `ipc/handlers.ts` (sessions:get / events / event-payload) **直接主进程同步 readFileSync, 不经 worker**。

## 缓存无界 (issue 属实)
- AssetFileCache (engine/assets/file-cache.ts): 指纹 {path,size,mtimeMs}, 粒度=整解析结果。
- executionDetailCache (session-detail.ts:247) + replayCache (session-replay.ts:22): 模块级/进程级/**无界**; pruneTo 从未对它们调用 (只 sessionCache 扫描侧)。replayCache 存**未截断全量**事件数组 (cap 只作用 IPC 出参)。

## meta 聚合逐行可行性 (流式行为不变命门 — 已逐字段核实)
parseSessionMeta + parseCodexSessionMeta 全部累加器逐字段核实: sessionId(覆盖) / timestamp(??=取首/直赋取尾) / tokenUsage(纯加法) / sawUsage(标志位末尾二选一) / skills-mcp(Set+末尾sort) / hookCounts(Map) / codex tokenUsage(取 max-by-total) — **零字段依赖 totalCount 或先有全部行**。detail/replay 的 byCallId 回填只依赖"先 use 后 result"顺序, 流式天然满足。**逐行流式可逐字节一致输出**。
