# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户指令 (2026-06-10, 会话内): "从用户体验角度出发做最优设计和实现并落地" — 针对 agent-teams 待产品决策项 (移除入口 vs 重分类运行时 vs 运行时态展示), 将决策权委托给 Agent, 以 UX 为判据选定最优方案并实现落地。
- docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md (残余部分)
- 前置任务: docs/works/2026-06-04-gh-94-remove-agent-teams/ (GH-94, 已完成静态资产面移除)
- GitHub Issue: https://github.com/Caldis/berth/issues/114

## 正文

### 原始 issue 残余诉求 (摘自 2026-06-03-BUG-agent-teams-runtime-state-classification.md)

- Claude Code 官方把 Agent Teams 描述为多个 Claude Code session 的运行时协作功能: team lead、teammates、shared task list、mailbox 等状态由 Claude Code 创建和更新。
- team config 存放在 `~/.claude/teams/{team-name}/config.json`, 含 session IDs、tmux pane IDs 等运行时状态, 不应手写或预先创建; 可复用 teammate role 应使用 subagent definitions。
- 预期: "Agent Teams 的本地文件如果需要展示, 应按运行时状态或会话协作状态处理, 并清楚标注它是 Claude Code 运行时生成的数据。Codex 视角下不应出现不适用的 Agent Teams 一级入口。"
- 解决方案选项 (issue 原文): 移除或条件显示一级入口 / 迁到 runtime-state 类别按官方 config.json 与 task list 结构读取 / 文案明确实验性运行时功能 / 测试覆盖 Codex 视角不显示与 runtime 展示口径。

### GH-94 已完成部分 (本任务前置)

- 移除 scanner 对 `~/.claude/teams` 与 `.claude/teams` 的静态 YAML 扫描、`AssetType` 中的 `team`、`/instructions/agent-teams` 导航入口、相关文案与测试。
- 现状仅剩 `src/renderer/src/App.tsx` 中 `RemovedAgentTeamsInstructionRedirect` 路由兜底。

### 本任务范围

- 决策: 是否以及如何展示 Agent Teams 运行时协作态 (不展示 / 关联到 Sessions / 独立运行时视图), 判据为用户体验。
- 实现: 选定方案的完整落地 (数据读取、IPC、UI、文案、测试、验收)。
- 约束: 明确标注实验性运行时功能、不可手写; Codex 视角不出现不适用入口。

### 本机数据事实 (0.0-new 时点采样)

- `~/.claude/teams/` 存在 5 个 team 目录: `f618f03e-…` (仅 inboxes/), `metric-report-team` (config.json), `tmux-try-demo` (config.json + inboxes/), `trace-cache-rework` (config.json), `tui-research` (config.json)。
- `config.json` 实测字段: name / description / createdAt(epoch ms) / leadAgentId / leadSessionId / members[] (agentId, name, agentType, model, prompt, color, planModeRequired, joinedAt, tmuxPaneId, cwd, subscriptions, backendType)。
- `inboxes/` 内为 `{member-name}.json` 成员收件箱。
- `~/.claude/tasks/` 下为大量 UUID 目录 (会话/团队任务列表数据, 契约待 explore 核对官方文档)。
