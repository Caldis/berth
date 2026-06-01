# PRD 快照 (只读)

来源: https://github.com/Caldis/berth/issues/16

# Hook Type Health Checks

Hook 行已经开始展示 handler `type` 和常见字段。下一步健康检查也应该理解这些字段, 否则用户只能看到 JSON, 但不能快速知道配置是否可能不会运行。

## 需要改进

- Claude Code:
  - `command` 缺 `command` 时提示错误。
  - `http` 缺 `url` 时提示错误。
  - `mcp_tool` 缺 `server` 或 `tool` 时提示错误。
  - `prompt` / `agent` 缺 `prompt` 时提示错误。
- Codex:
  - 非 `command` 类型提示“会被解析但不会执行”。
  - `async = true` 提示“当前会被跳过”。
  - Windows 环境下有 `commandWindows` 时展示覆盖关系。
- 健康提示应该出现在生命周期侧栏的 Hook 检查区域, hover / details 中能看到原因。
