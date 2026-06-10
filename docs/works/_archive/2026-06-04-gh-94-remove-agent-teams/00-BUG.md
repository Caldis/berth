# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: `docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md`; GitHub Issue #94。

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

# 期望 vs 实际
- 期望: Agent Teams 不作为可手写、可沉淀、可复用的静态指令资产展示; 可复用 teammate role 归入 Subagents / agent definitions; 如需展示运行时文件, 应按 Claude Code 运行时状态处理。
- 实际: `Agent Teams` 作为 `Instructions` 分组下的常驻入口出现, 扫描器只支持 Claude Code `teams` YAML, 当前实现没有区分“team 运行时状态”和“可复用 teammate role 定义”。
