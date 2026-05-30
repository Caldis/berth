# Agent Source Coverage

## 类型

IMPROVEMENT

## 状态

Open

## 背景

设置页“本地来源”已改为按 Agent 汇总, 明细只展示当前 scanner 实际返回的 scan roots。但继续核对官方文档和当前代码后, 还有一些本机 Agent 来源没有纳入扫描模型。

## 已验证事实

- Claude Code 官方文档列出 user / project / local / managed 多层配置。当前代码覆盖 `~/.claude`, `~/.claude.json`, 当前 `projectDir/.claude`, 当前 `projectDir/.mcp.json`; 未覆盖 macOS `/Library/Application Support/ClaudeCode/` 下的 managed settings / managed MCP, 也未覆盖系统策略来源。
- Claude Code 官方文档列出 user 与 project 两级 subagents / skills 等来源。当前代码只对当前 `projectDir` 扫项目级来源, 不从历史 session 中反推并扫描所有曾出现过的项目目录。
- Codex 开源实现存在 `sessions` 与 `archived_sessions` 两个 rollout 子目录常量。当前代码只扫描 `~/.codex/sessions/**/rollout-*.jsonl`, 未扫描 archived sessions。
- Codex 当前实现硬编码 `path.join(os.homedir(), '.codex')`; 如果未来需要支持可配置 Codex home, 需要先引入明确来源, 不能在设置页里伪造。

## 建议方向

- 保持设置页“本地来源”只展示 scanner 实际扫描的来源, 不列出未扫描路径。
- 新增“Agent source provider”层, 让每个 adapter 统一返回 user / project / managed / archive 等来源能力和是否启用。
- 对 Claude managed settings、Codex archived sessions、可配置 Codex home 分别做小步实现与测试。
- 对“所有项目目录”保持谨慎: 只在有明确 workspace 列表、用户选择目录, 或可验证的 session-derived 项目索引时纳入扫描; 不要递归扫磁盘。

## 验收建议

- macOS 上 Claude managed file-based settings 能作为只读来源显示并扫描。
- Codex archived sessions 可选择性纳入会话列表或在设置页明示未启用。
- 项目级来源只显示实际扫描的项目, 并能解释来源来自当前项目、用户选择, 还是 session-derived index。
