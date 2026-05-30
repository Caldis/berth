# Session Detail Tools Timeline And Artifacts

## 类型

IMPROVEMENT

## 背景

用户验收会话基础字段修复后指出, Session Detail 仍缺少完整复盘能力:

- Loaded assets 只显示 Skill / MCP / Hooks, 但当前会话常为空。
- 没有展示内置工具调用, 例如 Bash / PowerShell / Read / Edit / Write / TaskCreate / TaskUpdate。
- 没有按时间线展示 agent 在 session 中到底做了什么。
- Artifacts 区域的 plans / todos / files / checkpoints 仍然缺少明细。

## 只读验证

- Claude Code 官方 Tools reference 列出内置工具, 包含 `Agent`、`Bash`、`PowerShell`、`Read`、`Edit`、`Write`、`TaskCreate`、`TaskUpdate`、`TodoWrite`、`Skill` 等。
- 本机顶层 JSONL 中存在 `assistant.message.content[].tool_use` 和 `user.message.content[].tool_result`, 且可通过 `tool_use.id` / `tool_result.tool_use_id` 配对。
- 本机抽样中 `tool_use` 总量超过 5k, 包含内置工具、`Skill`、`mcp__<server>__<tool>`、`TaskCreate` / `TaskUpdate` 和少量旧 `TodoWrite`。
- `file-history-snapshot` 可提供 checkpoint 数量和部分文件备份信息。
- 没有发现稳定的 `Host` / `host` 结构字段, 不能先按 Host 设计解析。

## 建议方向

- 扩展 `SessionDetailResult`, 新增 detail-only 的 `toolTimeline` 和 `artifacts` 字段。
- 解析工具时间线时只保存元数据: 工具名、类别、时间、状态、错误标记、关联文件路径、MCP server、Skill 名称; 不默认保存命令输出、文件内容或完整 tool input。
- Artifacts 从 transcript 中提取:
  - plans: `EnterPlanMode` / `ExitPlanMode`
  - todos/tasks: `TodoWrite` 或 `TaskCreate` / `TaskUpdate` / `TaskList`
  - files: `Read` / `Edit` / `Write` / `MultiEdit` / `NotebookEdit` 等工具的路径字段
  - checkpoints: `file-history-snapshot`
- 子代理的中间工具调用需要递归读取 session 目录下的 `subagents/*.jsonl`; 父会话只包含 `Agent` 调用和最终结果, 不包含子代理每一步。

## 验收建议

- Session Detail 能按时间顺序展示内置工具、Skill、MCP 和 Task/Todo 工具调用。
- Loaded assets 不再只依赖 Skill/MCP; 同时有工具摘要和真实使用过的资产列表。
- Artifacts 展示 plans / todos / touched files / checkpoints 的真实明细或明确 unknown/empty。
- 不把敏感正文、命令输出、文件内容默认塞进 renderer 数据。
