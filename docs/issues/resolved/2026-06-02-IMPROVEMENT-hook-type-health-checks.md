# Hook Type Health Checks

## 类型

IMPROVEMENT

## 状态

Resolved

## GitHub

- Issue: https://github.com/Caldis/berth/issues/16
- Number: #16
- State: CLOSED

## 完成记录

- Work: `docs/works/_archive/2026-06-02-gh-16-hook-type-health-checks`
- Code: `src/main/engine/health.ts`
- Tests: `tests/unit/health-check.test.ts`

## 已完成

- Claude Code typed handler required fields:
  - `http` 缺 `url`
  - `mcp_tool` 缺 `server` / `tool`
  - `prompt` / `agent` 缺 `prompt`
- Codex:
  - `async = true` / `async_ = true` 提示会跳过
  - Windows 下 `commandWindows` 覆盖 `command` 时提示
- 新增检查继续带 hooks 官方文档 evidence, target 指向 `/configuration/capabilities?tab=hooks`。

## 验证

- `pnpm test -- tests/unit/health-check.test.ts`
- `pnpm typecheck:node`
- `pnpm harness:check`
