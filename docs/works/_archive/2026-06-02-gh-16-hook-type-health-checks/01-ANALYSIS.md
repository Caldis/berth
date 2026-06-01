# 需求分析 (Explore 产物)

## 现状理解

相关实现集中在 `src/main/engine/health.ts`, 测试在 `tests/unit/health-check.test.ts`。

当前已有能力:
- Claude Code: 检查 command hook 缺 command、未知 type、args + shell、Windows PowerShell shell hint。
- Codex: 检查非 command 类型会跳过、command 缺 command、Windows command 缺 commandWindows。
- UI: Hooks 生命周期侧栏已经读取 hook health checks, hover details 展示原因。

缺口:
- Claude Code 对 http / mcp_tool / prompt / agent 的必填字段未检查。
- Codex collectHooks 未读取 `async` / `async_`, 因此 async 跳过无法检查。
- Codex 有 `commandWindows` 时没有健康提示说明覆盖关系。

## 官方依据

- Claude Code hooks reference: handler 类型包括 command、http、mcp_tool、prompt、agent; prompt 和 agent 需要 `prompt`; http 需要 `url`; mcp_tool 需要 `server` 与 `tool`。参考 https://code.claude.com/docs/en/hooks
- Codex hooks reference: `commandWindows` 是 Windows-only override; `async` 会被解析但 async command hooks 还不支持, 会被跳过; 当前只有 `type = "command"` 会运行。参考 https://developers.openai.com/codex/hooks

## 验收标准

1. Claude Code `http` 缺 `url` 产生 error。
2. Claude Code `mcp_tool` 缺 `server` 或 `tool` 产生 error。
3. Claude Code `prompt` / `agent` 缺 `prompt` 产生 error。
4. Codex `async = true` 或 `async_ = true` 产生 info, 说明会跳过。
5. Windows 下 Codex 同时存在 `command` 和 `commandWindows` 时产生 info, 说明 Windows 覆盖关系。
6. 既有 command 缺失、非 command 类型、Windows command warning 不回退。
7. 所有 hook 健康检查都带官方 evidence, target 指向 hooks tab。

## 界面质量与交互验收

本任务只补健康检查数据源。UI 侧边栏已能聚合并 hover 展示详情, 不改 UI 结构。

## 未决问题

无。
