# 描述
- Agent Teams 当前被建模为 `instruction` 类静态资产, 并作为 `Instructions` 下的一级入口展示。
- Claude Code 官方文档把 Agent Teams 描述为多个 Claude Code session 的运行时协作功能: team lead、teammates、shared task list、mailbox 等状态由 Claude Code 创建和更新。
- 官方文档还明确说明 team config 存放在 `~/.claude/teams/{team-name}/config.json`, 其中包含 session IDs、tmux pane IDs 等运行时状态, 不应手写或预先创建; 可复用 teammate role 应使用 subagent definitions。

# 重现步骤
- 查看导航配置: `src/renderer/src/components/layout/nav-config.ts` 中存在 `/instructions/agent-teams`。
- 查看页面过滤: `src/renderer/src/pages/instructions.tsx` 将 `agentTeams` 映射到 `asset.type === "team"`。
- 查看资产类型: `src/shared/types/asset.ts` 将 `team` 列为通用 `AssetType`。
- 查看扫描器: `src/main/adapters/claude-code/scanner.ts` 扫描 `~/.claude/teams` 和 `.claude/teams` 下的 YAML 文件, `src/main/adapters/claude-code/parsers.ts` 将其解析为 `category: "instruction"`、`agentId: "claude-code"`、`type: "team"`。
- 查看官方文档: https://code.claude.com/docs/en/agent-teams

# 预期结果
- Agent Teams 不应作为可手写、可沉淀、可复用的静态指令资产展示。
- 可复用 teammate role 应归入 Subagents / agent definitions。
- Agent Teams 的本地文件如果需要展示, 应按运行时状态或会话协作状态处理, 并清楚标注它是 Claude Code 运行时生成的数据。
- Codex 视角下不应出现不适用的 Agent Teams 一级入口。

# 实际结果
- `Agent Teams` 作为 `Instructions` 分组下的常驻入口出现。
- 扫描器只支持 Claude Code `teams` YAML, 没有 Codex 对应来源。
- 当前实现没有区分“team 运行时状态”和“可复用 teammate role 定义”, 容易让用户误以为 Agent Teams 是类似 Skills、Subagents、Commands 的静态资产。

# 解决方案
- 调整信息架构: 移除或条件显示 `Agent Teams` 一级入口; 优先把可复用角色能力放在 Subagents。
- 调整资产模型: 如果继续展示 Agent Teams, 将其从 `instruction` 静态资产迁到 runtime/state 类别, 并按官方 `config.json` / task list 结构读取。
- 调整文案: 明确 Agent Teams 是 Claude Code 实验性运行时功能, 不建议手写 team config。
- 调整测试: 增加 Codex 视角下不显示不适用入口的覆盖, 并覆盖 Claude Code runtime team state 的展示口径。
