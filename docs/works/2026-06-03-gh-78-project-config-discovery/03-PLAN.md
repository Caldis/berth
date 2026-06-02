# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。任务按顺序执行; adapter、watcher 和 e2e 共享同一套 project roots, 不并行拆分。
每个实现项必须有测试证据或明确例外理由。

- [ ] 任务 1: 新增 project config roots helper
  - tests: `pnpm test tests/unit/project-config-roots.test.ts`
  - verify: 非 UI; 子目录 cwd 返回仓库根到 cwd 的层级目录, Windows/重复路径去重。
- [ ] 任务 2: Claude Code adapter/scanner 使用 project roots
  - tests: `pnpm test tests/unit/claude-code-adapter.test.ts tests/unit/claude-scanner.test.ts`
  - verify: 非 UI; 子目录 cwd 能扫到父级 `.claude/skills`, `.claude/agents`, `.claude/settings.json`, `.mcp.json` 和 `CLAUDE.md`。
- [ ] 任务 3: Codex adapter 使用 project roots
  - tests: `pnpm test tests/unit/codex-adapter.test.ts`
  - verify: 非 UI; 子目录 cwd 能扫到父级 `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, `.codex/agents`, `.agents/skills`。
- [ ] 任务 4: watcher 使用 project roots
  - tests: `pnpm test tests/unit/watcher.test.ts`
  - verify: 非 UI; watch paths 包含父级 project roots 的 Claude/Codex 配置路径。
- [ ] 任务 5: project scope e2e 覆盖父级 project skill 可搜索
  - tests: `pnpm build`; `pnpm test:e2e tests/e2e/project-scope.e2e.ts`
  - verify: UI 数据可见; session cwd 位于项目子目录, project skill 位于父级 `.agents/skills`, 切换到项目后搜索能找到, 切回用户域后消失。
- [ ] 任务 6: verify / archive
  - tests: `pnpm harness:check --work docs/works/2026-06-03-gh-78-project-config-discovery`; `pnpm harness:prepush`; `node scripts/harness-projects.mjs check --strict`
  - verify: 任务归档前填写 final debt, Project item 置 Done, CI 对最终 SHA 通过。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
