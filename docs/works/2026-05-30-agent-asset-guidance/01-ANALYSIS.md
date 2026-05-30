# 需求分析 (Explore 产物)

## 现状理解
本次影响渲染层页面和少量解析契约, 不需要改 IPC 通道:

- `src/shared/types/asset.ts` 定义统一 Asset model。当前资产按 `category` 分为 instruction / capability / state / observability / integration, 按 `type` 细分为 `skill`, `agent`, `command`, `mcp-server`, `hook`, `plugin`, `statusline`, `permission`, `env` 等。
- `src/renderer/src/pages/instructions.tsx` 展示指令类资产: memories, skills, subagents, commands, output modes, agent teams。
- `src/renderer/src/pages/capabilities.tsx` 展示能力类资产: MCP, hooks, plugins, status line, permissions, env。
- `src/renderer/src/i18n/locales/{en,zh}.json` 是页面可见文案来源。现有页面只有 tab 名称、筛选器和列表, 除 hooks 外缺少入门说明。
- `src/main/adapters/claude-code/parsers.ts` 目前把 Claude Code `settings.json` 的 `permissions.allow/deny` 解析成两条 `permission` 资产, meta 为 `{ kind, rules }`; 把 `env` 解析成一条 `env` 资产, meta 为 `{ keys, count }`。

权限和环境变量当前的实际用途:

- 权限: 表达 Agent 对工具、文件、命令、MCP、子 Agent 等动作的允许/询问/拒绝边界。它不是提示词建议, 而是宿主 agent runtime 执行的安全策略。
- 环境变量: 表达 Agent 会话或子进程运行时要带上的环境配置, 常用于功能开关、遥测、provider/MCP/API 凭据入口。Berth 只应展示变量名和来源, 不应暴露敏感值。

已验证的 UI/数据契约问题:

- `PermissionsSection` 读取 `meta.listType` 和 `meta.pattern`, 但 parser 产出 `meta.kind` 和 `meta.rules`。因此已有权限资产可能计数存在, 但 allow/deny 列表显示为空。
- `EnvSection` 按单个变量显示 `asset.name` 和 `meta.value`, 但 parser 当前只产出一个名为 `env` 的聚合资产和 `meta.keys`。因此用户看不到真实变量名列表。

## 关联与依赖
- 抽象层边界: Berth 不应把所有说明写成 "Claude Code 的某个配置文件"。页面首段应先解释通用资产概念, 再列出当前 provider 对应的官方文档。
- 当前 provider:
  - Claude Code: settings / permissions / hooks / MCP / status line / skills / plugins 等官方文档都可链接。
  - Codex: 当前 parser 已支持 `AGENTS.md`, skills, custom agents, MCP, hooks。官方文档确认 `~/.codex/config.toml` 与 `.codex/config.toml` 是配置来源, permission/sandbox 由 `approval_policy`, `sandbox_mode`, named permission profiles 等控制。
- Scope 差异:
  - Claude Code settings 官方文档把 user / project / local / managed 分开, 且说明 permission rules 会按 scope 合并。
  - Codex 官方文档把 user-level `~/.codex/config.toml` 与 project-scoped `.codex/config.toml` 分开, project scope 需要 trusted project。
- 官方资料:
  - Claude Code settings: https://code.claude.com/docs/en/settings
  - Claude Code permissions: https://code.claude.com/docs/en/permissions
  - Claude Code MCP: https://code.claude.com/docs/en/mcp
  - Claude Code hooks: https://code.claude.com/docs/en/hooks
  - Claude Code status line: https://code.claude.com/docs/en/statusline
  - Claude Code skills: https://code.claude.com/docs/en/skills
  - Claude Code plugins: https://code.claude.com/docs/en/plugins
  - Codex config reference: https://developers.openai.com/codex/config-reference
  - Codex permissions: https://developers.openai.com/codex/permissions
  - Codex approvals and sandbox: https://developers.openai.com/codex/agent-approvals-security
  - MCP protocol intro/spec: https://modelcontextprotocol.io/docs/getting-started/intro, https://modelcontextprotocol.io/specification/2025-06-18/server/tools

调用关系:

1. 主进程 scanner 解析本地配置为 `Asset[]`。
2. renderer store 读取 assets。
3. `Instructions` / `Capabilities` 根据 active tab 和 agentView 过滤资产。
4. 页面组件渲染 tab-specific cards。

本次优先把解释层放在 renderer, 同步修复权限/env 两处展示契约。若后续接入更多 agent, 可继续扩展同一份资产说明元数据, 不需要重写每个页面结构。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Instructions 每个资产 tab 都有简短说明, 说明通用概念、当前列表含义、scope 意义, 并提供对应官方文档链接。
2. Capabilities 每个资产 tab 都有简短说明, 说明通用概念、当前列表含义、scope/敏感信息边界, 并提供对应官方文档链接。
3. 权限 tab 能正确展示 `kind/rules` 和未来可能出现的 `listType/pattern` 两种 meta 形态; allow/deny 不再因字段名不一致而空白。
4. 环境变量 tab 能正确展示聚合 `keys` 形态和未来单变量 `value` 形态; 敏感值仍然遮蔽。
5. 文案中先使用 provider-neutral 的“资产/能力/运行边界/上下文/扩展”等概念, 再用 Claude Code / Codex 作为当前 provider 例子。
6. 中英文 i18n 同步, 不出现缺失 key。
7. 至少通过 typecheck、相关单元测试、harness:check。若执行视觉验收, 需要按项目规则用 Electron 实测窗口坐标截图。

## 未决问题
留给 design 向人澄清。
无。当前需求可以按抽象资产说明层直接设计。
