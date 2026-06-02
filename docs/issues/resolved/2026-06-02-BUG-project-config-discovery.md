# Project Config Discovery

## 类型

BUG

## 状态

Resolved

## 完成日期

2026-06-03

## 背景

项目级约定、skills、子代理、MCP 和 hooks 等资产曾只按当前 `projectDir` 扫描。若 Codex / Claude Code 会话 cwd 位于仓库子目录, 父级或仓库根的项目配置会被漏掉, 导致 UI 展示和实际 Agent 能力不一致。

## 已验证事实

- Claude Code 项目来源现在从会话 cwd 向上解析到仓库根, 能发现父级 `CLAUDE.md`, `.claude/settings.json`, `.claude/skills`, `.claude/agents`, `.mcp.json`。
- Codex 项目来源现在使用同一套 project roots, 能发现父级 `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, `.codex/agents`, `.agents/skills`。
- watcher 已使用同一套 project roots, 父级 Claude / Codex 项目配置路径会被纳入监听。
- project scope e2e 已覆盖“session cwd 在子目录, project skill 在父级 `.agents/skills`”的场景。

## 完成记录

- 新增 `src/main/project-config-roots.ts`, 统一处理从子目录 cwd 到仓库根的项目配置 roots。
- Claude Code adapter / scanner 使用 `projectDirs` 扫描父级和当前目录的项目配置。
- Codex adapter 使用 `projectDirs` 扫描父级和当前目录的项目配置。
- watcher 使用同一 helper 生成项目级 watch paths。
- Project Scope e2e fixture 改为子目录 cwd, 验证切换项目后搜索能找到父级 project skill。

## 验收记录

- `pnpm test tests/unit/project-config-roots.test.ts`
- `pnpm test tests/unit/claude-code-adapter.test.ts tests/unit/claude-scanner.test.ts`
- `pnpm test tests/unit/codex-adapter.test.ts`
- `pnpm test tests/unit/watcher.test.ts`
- `pnpm build`
- `pnpm test:e2e tests/e2e/project-scope.e2e.ts`
- `pnpm harness:prepush`
- `node scripts/harness-projects.mjs check --strict`

## 归档

- 任务归档路径: `docs/works/_archive/2026-06-03-gh-78-project-config-discovery/`
