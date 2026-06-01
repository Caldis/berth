# Agent Source Coverage

## 类型

IMPROVEMENT

## 状态

Resolved

## 完成日期

2026-06-02

## 背景

设置页“本地来源”已改为按 Agent 汇总, 明细只展示当前 scanner 实际返回的 scan roots。继续核对官方文档和当前代码后, 发现一些本机 Agent 来源没有纳入扫描模型。

## 已验证事实

- Claude Code 官方文档列出 user / project / local / managed 多层配置。当前实现已覆盖 `~/.claude`, `~/.claude.json`, 当前 `projectDir/.claude`, 当前 `projectDir/.mcp.json`, 以及 file-based managed settings / managed MCP。
- Claude Code 官方文档列出 user 与 project 两级 subagents / skills 等来源。当前实现只扫描当前 `projectDir` 的项目级来源; 历史 session 中出现过的项目目录作为 `not-scanned` 候选来源展示, 不自动递归扫描磁盘。
- Codex 开源实现存在 `sessions` 与 `archived_sessions` 两个 rollout 子目录常量。当前实现已扫描两者, archived session 会标记 `meta.archived = true`。
- Codex 用户级来源已跟随 `CODEX_HOME`; 未设置时回退到 `~/.codex`。`$CODEX_HOME/skills` 与旧的 `~/.agents/skills` 都作为用户技能来源处理。

## 完成记录

- `scanSourceCoverage()` 已成为 adapter 的结构化来源契约, 区分 `kind`, `status`, `reason`。
- 设置页按 Claude Code / Codex 两个 Agent 汇总, 默认不展示路径; 展开后按 user / project / enterprise / session 分组显示明细。
- `scanned` 来源提供打开入口; `not-scanned` / `missing` 来源只解释状态, 不提供打开操作。
- watcher 已纳入 Claude managed files、Codex active sessions、Codex archived sessions, 并跟随 `CODEX_HOME`。

## 验收记录

- `pnpm test -- tests/unit/claude-code-adapter.test.ts tests/unit/codex-adapter.test.ts tests/unit/engine-scanner.test.ts`
- `pnpm test -- tests/unit/claude-code-adapter.test.ts tests/unit/codex-adapter.test.ts tests/unit/watcher.test.ts`
- `pnpm test -- tests/unit/claude-scanner.test.ts tests/unit/engine-scanner.test.ts`
- `pnpm test -- tests/renderer/settings-sources.test.tsx`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm harness:check`

## 归档

- 任务归档路径: `docs/works/_archive/2026-05-30-settings-scan-directories/`
