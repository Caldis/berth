# Hook Type Health Checks

## 类型

IMPROVEMENT

## 状态

Open

## GitHub

- Issue: https://github.com/Caldis/berth/issues/16
- Number: #16

## 关联任务

- 来源归档: `docs/works/_archive/2026-06-01-gh-11-claude-hook-soft-disable/`

## 背景

Hook 行已经开始展示 handler `type` 和常见字段。下一步健康检查也应该理解这些字段, 否则用户只能看到 JSON, 但不能快速知道配置是否可能不会运行。

## 已验证事实

- Claude Code Hook handler 类型包括 `command`、`http`、`mcp_tool`、`prompt`、`agent`。
- Codex 当前只执行 `type = "command"` 的 handler; `prompt` / `agent` 会解析但跳过, `async = true` 也会跳过。
- 当前 UI 已展示 type、command、url、server/tool、prompt/model、timeout、statusMessage 等字段。

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

## 验收方向

- 错误配置能在 Hooks 页被看到, 不需要用户展开 JSON 才发现。
- 正常配置仍显示“正常”, 并有 hover 解释。
- Codex 与 Claude Code 的差异不混在同一套文案里。
