# 需求分析 (Explore 产物)

## 现状理解
用户报告: Windows 下“指令 / 能力 / 用量”完全没有数据, macOS 下正常。

相关链路:
- 渲染层: `src/renderer/src/pages/instructions.tsx`, `capabilities.tsx`, `usage.tsx`, `overview.tsx`, `hooks/use-ipc.ts`, `stores/app.ts`。
- preload: `src/preload/index.ts` 暴露 `assets.scanAll`, `sessions.list`, `usage.summary`。
- 主进程 IPC: `src/main/ipc/handlers.ts` 注册 `assets:scan-all`, `sessions:list`, `usage:summary`。
- 扫描器: `src/main/engine/scanner.ts` 调 `src/main/adapters/claude-code/*`, 读取 `os.homedir()/.claude`。

Windows 本机事实:
- `C:\Users\mail\.claude` 存在。
- 源文件存在: skills=2, settings.json=true, stats-cache.json=true, projects 下递归 JSONL=1252。
- `usage-data/*.json` 当前为 0, 但 `stats-cache.json` 含 `dailyActivity`, `dailyModelTokens`, `modelUsage`, `totalSessions`, `totalMessages`。
- 运行时 IPC 直接调用 `window.api.assets.scanAll()` 返回: `skills=2`, `hooks=5`, `plugins=4`, `sessions=21`, `stats-cache=1`, `errors=[]`。
- 同一运行时点击“指令”和“能力”页面仍显示“暂无内容”。

## 关联与依赖
1. 指令 / 能力页面的数据断点在渲染层 store:
   - `useAssets()` 调 `assets.scanAll()` 后只写 hook 内部 `useState`。
   - `Instructions` 与 `Capabilities` 读取 `useAppStore((s) => s.assets)`。
   - 当前没有任何调用把扫描结果写入 `useAppStore.setAssets` / `setStats`。
   - 结果: 扫描器能返回数据, 但这两个页面始终从空 store 渲染。

2. 用量页有两个断点:
   - `Usage` 页面直接调 `usage.summary`。
   - `usage:summary` 从 `scanner.getAllAssets()` 里找 `usage-data` 资产聚合。
   - 如果此前没有可靠完成 `scanAll()`, 主进程缓存可能为空。
   - Windows 当前没有 `usage-data/*.json`, 只有 `stats-cache.json`; 现有 `usage:summary` 完全忽略 `stats-cache`。
   - 结果: 即使 `scanAll()` 读到了 `stats-cache`, 用量仍返回 0 和空图表。

3. Windows 会话结构还有一个完整性问题:
   - `scanState()` 只扫 `~/.claude/projects/<encoded>/*.jsonl` 第一层。
   - Windows 当前有大量 `~/.claude/projects/<encoded>/<session>/subagents/*.jsonl` 递归 JSONL。
   - 运行时只算到 21 个 session, 而文件系统递归共有 1252 个 JSONL。
   - 这不是“指令 / 能力页空”的主因, 但会影响会话与后续用量/关系统计。

4. 能力页默认 tab 是 MCP:
   - Windows 当前 `.claude.json` 顶层 `mcpServers=0`, settings 内有 hooks。
   - store 修好后, 能力页 hooks/plugins 应出现; MCP 仍可能为 0, 这是源数据事实。
   - 如果要展示嵌套 MCP 或 Claude 新格式, 需另行核对 `.claude.json` 的真实结构, 避免把不支持的字段误解为 MCP。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Windows 下打开“指令”页面, 已扫描到的 instruction 资产能显示, 至少包含当前本机 2 个 user skill。
2. Windows 下打开“能力”页面, 已扫描到的 capability 资产能显示, 至少 hooks=5 / plugins=4 的数据可从相应 tab 访问; MCP 为 0 时应表现为该 tab 空, 不能导致整个能力页误判无数据。
3. “用量”页面在没有 `usage-data/*.json` 但存在 `stats-cache.json` 时, 能从 `stats-cache` 展示 token / model / daily activity 中可真实支持的数据; 成本没有真实值时保持 0 或明确空, 不伪造成本。
4. `sessions:list` / `usage:summary` 不依赖页面访问顺序; 直接打开对应页面也应触发或复用一次可靠扫描结果。
5. Windows session 扫描策略覆盖 Claude 当前递归 JSONL 结构, 或明确只统计顶层 session 并排除 subagent JSONL; 选择必须在 SPEC 中写清楚。
6. 增加可测试覆盖: 至少有一个渲染层测试证明 scan 结果进入页面数据源, 一个主进程/解析测试覆盖 `stats-cache` fallback, 一个 Windows 风格路径/递归 session fixture。

## 未决问题
留给 design 向人澄清。
- 是否把 subagent JSONL 当成独立 session 展示, 还是只作为父 session 的关联明细? 当前文件结构显示递归 JSONL 数远大于顶层 JSONL, 需要产品语义确认。
- 用量页是否只展示 token / model / message / tool-call activity, 还是必须展示成本? Windows 当前 `stats-cache` 中 `costUSD` 为 0, 没有可靠成本来源。
- 能力页默认打开 MCP tab 时, MCP 为 0 但 hooks/plugins 有数据, 是否要保持默认 MCP, 还是自动切到第一个有数据的 tab?
