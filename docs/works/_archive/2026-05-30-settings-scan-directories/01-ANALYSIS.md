# 需求分析 (Explore 产物)

## 现状理解

本问题表面在 renderer 设置页, 根因在“扫描能力已经演进成多 Agent 聚合, 设置页仍是 v0.1 Claude-only 静态文案”。

当前真实扫描入口:

1. `src/main/index.ts` 在 app ready 后调用 `resolveDefaultProjectDir({ isDev, cwd })`, 再把结果传给 `initScanner(projectDir)` 和 `watcher.start(projectDir)`。
2. `src/main/engine/scanner.ts` 的 `AssetScanner` 构造函数固定创建两个 adapter: `new ClaudeCodeAdapter(projectDir)` 和 `new CodexAdapter()`。
3. `scanAll()` 逐个 adapter 调 `adapter.scanAll()`, 聚合 assets 与 errors; 单个 adapter 失败会写入 errors, 不阻断另一个 adapter。
4. renderer 的 `useAssets()` 调 `window.api.assets.scanAll()`, 经 preload 到主进程 `assets:scan-all`。
5. `sessions:list` 会先 `ensureScanned()`, 然后从全部 assets 中筛 `type === "session"`, 再按 `agentView` 过滤 Claude / Codex / all。

Claude Code adapter 的扫描范围:

- user root: `~/.claude/`
- user MCP file: `~/.claude.json`
- project root: `<projectDir>/.claude/` 和 `<projectDir>/.mcp.json`。dev 模式下当前 `projectDir` 为 `undefined`, 所以只扫用户级 Claude 资产。
- instruction: `CLAUDE.md`, `AGENTS.md`, skills, agents, commands, output-modes, teams。
- capability: MCP servers, hooks, permissions, env, plugins, statusline。
- state: `~/.claude/projects/<encoded>/*.jsonl`, plans, todos, history。
- observability: stats-cache, usage-data。
- integration: IDE locks, credentials existence。

Codex adapter 的扫描范围:

- root: `~/.codex/`
- 当前只实现 `state` 类 session 扫描。
- 实际扫描文件是 `~/.codex/sessions/**/rollout-*.jsonl`。
- parser 从 rollout JSONL 里读 `session_meta` / `turn_context` / `event_msg` / `response_item`, 生成 `agentId: "codex"` 的 session asset 和 detail timeline。
- 当前没有扫描 Codex 的配置、memory、MCP、plugin 或 archived sessions; 这是有意的窄实现, 不是“所有 Codex 资产”。

“所有项目级别会话”的真实含义:

- Claude Code 的项目会话不是从每个项目目录递归发现, 而是集中读 `~/.claude/projects/<encoded>/*.jsonl`; project path 由 transcript 元信息或编码目录名解析出来。
- Codex 的项目会话也不是从项目目录发现, 而是集中读 `~/.codex/sessions/**/rollout-*.jsonl`; project path 来自 rollout 元信息里的 `cwd`。
- 所以会话页看起来覆盖了很多项目, 是因为两个 Agent 的用户级 session store 本身包含跨项目记录, 不是设置页展示的单个 `~/.claude/` 目录在控制全部扫描范围。

设置页当前行为:

- `src/renderer/src/pages/settings.tsx` 只通过 `platform.info()` 取 `homeDir/platform/version`, 拼出 `~/.claude` 的绝对路径。
- “扫描目录”区域写死显示 `~/.claude/`, 按钮只调用 `shell.openPath(claudeDir)`。
- 这个目录没有传回 scanner, 不影响 adapter 列表, 不影响 `scanAll()`, 不影响 `sessions:list`。
- `src/main/ipc/handlers.ts` 的 `platform:info` 仍只返回 `claudeDir`, 没有 Codex root 或 adapter roots。
- `fileWatching` 与 `advancedMode` 目前只写 localStorage; 没有控制主进程 watcher, 也没有过滤 asset 展示。

外部资料边界:

- Anthropic 官方文档确认 Claude Code 存在 user/project settings 与 user/project subagents/memory 等路径, 支持当前 Claude adapter 的基本路径判断: https://docs.anthropic.com/en/docs/claude-code/settings 和 https://docs.anthropic.com/en/docs/claude-code/memory
- OpenAI 官方 Help 对 Codex CLI 只说明它在本地机器运行; 本地 rollout/session 文件布局没有作为稳定公开 API 文档化: https://help.openai.com/en/articles/11096431
- OpenAI Codex 开源仓库当前源码显示 `SESSIONS_SUBDIR = "sessions"`、`ARCHIVED_SESSIONS_SUBDIR = "archived_sessions"`, 并在 rollout list/metadata 里处理 `rollout-*.jsonl` 与 `session_index.jsonl`。因此 Berth 的 Codex session 兼容应按“本机样本 + 开源实现”处理, 不把它描述成稳定平台契约。

## 关联与依赖

1. 设置页不应该继续从 `platform.info().homeDir` 自己拼路径。它需要一个主进程 IPC, 从 scanner/adapters 返回真实 scan roots。
2. `AgentAdapter.scanRoots()` 类型已经存在, Claude/Codex adapter 都已实现, 但目前没有 IPC 暴露, renderer 没有消费。
3. `CodexAdapter.scanRoots()` 目前只返回 `~/.codex`, 但实际 scan path 是 `~/.codex/sessions`; 如果设置页要“准确告诉用户读了哪里”, 需要 either:
   - 让 Codex scanRoots 返回更具体的 `~/.codex/sessions`, 或
   - 在 UI 里把 `~/.codex` 作为 agent home, 子说明写明 sessions 子树会被读取。
4. `AssetWatcher` 仍只监听 Claude 路径: `~/.claude`, optional project `.claude`, project `.mcp.json`, `~/.claude.json`。如果 UI 声称“文件监听会自动刷新所有资产”, 就需要纳入 `~/.codex/sessions` 或把文案限制为 Claude-only。
5. `runHealthChecks()` 仍以 `~/.claude` 不存在作为 error。多 Agent 视角下, 用户可能只有 Codex, 不应得到“Claude Code not installed”这种全局错误。
6. `computeMcpMerged()` 仍是 Claude-only, 但它属于 MCP 能力页, 本轮只需避免设置页误导, 不必顺手扩到 Codex。
7. PRD 里曾写“扫描目录配置(允许添加额外路径)”和“显式扫描路径列表”。当前代码没有自定义路径配置能力, 且安全约束强调路径白名单。短期不应把设置项做成任意目录输入。

历史取舍:

- v0.1 PRD 以 Claude Code 为 MVP, 后续才规划 Codex / Cursor adapter。
- 最近的 Codex session 支持已经把 scanner 从单 adapter 改成多 adapter, 并加了 `agentView`。
- 设置页没有跟随这次演进, 所以现在 UI 表述落后于数据层。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 设置页不再硬编码只展示 `~/.claude/` 作为唯一扫描目录。
2. 设置页展示的扫描来源必须来自主进程真实 adapter roots, 至少包含 Claude Code 与 Codex 两类来源。
3. UI 文案不应让用户误以为“扫描目录”是当前可配置输入; 如果只是只读透明度列表, 应命名为“本地来源”或“Agent 来源”。
4. Codex session 扫描来源要明确到 `~/.codex/sessions` 或在 `~/.codex` 下清楚说明 sessions 子树。
5. Claude Code 来源要区分 user scope 与 project scope; dev 模式没有 projectDir 时不能伪造项目级来源。
6. “在资源管理器中显示”只能打开真实存在的 path; 不存在的 source 要显示未发现/未启用状态, 不应调用 shell 打开。
7. file watching 文案必须与实际能力一致: 要么接入真实 watcher 配置并覆盖 Codex sessions, 要么把当前 toggle 隐藏/降级为未来功能。
8. health check 不应在 Codex-only 环境下把缺少 `~/.claude` 当成全局错误。
9. 修改需补 renderer 测试或 IPC 单元测试, 覆盖多 root 展示、Claude-only / Codex-only / both 三种状态。
10. `pnpm typecheck`, 目标测试, `pnpm harness:check` 通过。

## 未决问题
留给 design 向人澄清。

1. 本轮是否把 scope 收到“只修扫描来源展示”, 还是同时修 fileWatching / health check 的 Claude-only 假设? 我的建议是至少把 health check 文案改成 agent-aware; fileWatching 如果不接主进程, 就先从设置里隐藏或禁用, 避免继续误导。
2. 是否保留“扫描目录”这个标题? 我的建议是不保留。改成“本地来源”更准确: Berth 的目标是发现本机 Agent 资产, 不是让用户手动选择一个根目录。
3. 是否做“添加目录”? 我的建议本轮不做。当前扫描器是 adapter 白名单模型, 任意路径输入会放大隐私与性能风险, 也不能让 Codex/Claude parser 自动理解未知目录。
