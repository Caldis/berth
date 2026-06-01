# Plan

- [x] 任务 1: 建立任务态并创建 GitHub Project item; verify: `pnpm harness:check`。
- [x] 任务 2: 补全 explore/design/plan 文档并切到 implement; verify: `pnpm harness:check`。
- [x] 任务 3: 改 `harness-lib` / `harness-sync` / sync 单测, 支持 `harness-*`, `polish`, 清理旧 `opsx-*`; verify: `pnpm test tests/harness/sync.test.ts`, `pnpm harness:sync -- --check` 预期先失败后同步通过。
- [x] 任务 4: 改 `harness-check` / check 单测 / 模板, 支持 `phase=polish` 与 `04-POLISH.md`; verify: `pnpm test tests/harness/check.test.ts`, `pnpm harness:check`。
- [x] 任务 5: 新增 `scripts/harness-projects.mjs` 和单测, 支持 Project Done 同步与只读审计; verify: `pnpm test tests/harness/projects.test.ts`, `pnpm typecheck:node`。
- [x] 任务 6: 更新 `.agents/workflow`、`.agents/README.md`、`AGENTS.md`、issues/friction 模板, 将 archive Project 同步写成阻塞步骤; verify: `pnpm harness:check`。
- [x] 任务 7: 运行 `pnpm harness:sync`, 暂存新 `harness-*` 分发产物并删除旧 `opsx-*`; verify: `pnpm harness:check`。
- [x] 任务 8: 只读执行 `pnpm harness:projects:check`, 记录当前 Project 漂移; verify: `harness-projects: all project statuses match local task state`。
- [x] 任务 9: 最终验证与任务态收口到 verify; verify: `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts`, `pnpm typecheck:node`, `pnpm harness:check`。
- [x] 任务 10: 根据 implement 阶段测试纪律反馈, 补强 design / implement / verify / 模板与 harness-check; tests: `pnpm test tests/harness/check.test.ts`; verify: `pnpm harness:check`。
- [x] 任务 11: 将 GitHub Issue 任务 ID 契约写入 workflow / 模板 / 入口规则, 取代 Jira 字段; tests: not needed - 纯流程文档与模板契约改动, 由 `pnpm harness:check` 校验; verify: `pnpm harness:check`。
- [x] 任务 12: 扩展 `harness-projects` 支持 issue 绑定、Project ensure/start 和严格审计; tests: `pnpm test tests/harness/projects.test.ts`; verify: `pnpm typecheck:node`。
- [x] 任务 13: 扩展 `harness-check` 校验 active works 的 `task_id` / `issue` / `gh_project.item_id` 与 `gh-{number}` 目录名; tests: `pnpm test tests/harness/check.test.ts`; verify: `pnpm harness:check`。
- [x] 任务 14: 迁移当前 active works 到 `{date}-gh-{number}-{desc}` 并回写 GitHub Issue/Project 元数据; tests: not needed - 元数据和目录迁移, 用 `pnpm harness:check` 与 `node scripts/harness-projects.mjs check --strict` 验证; verify: `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`。
- [ ] 任务 15: 扫描并清理非历史文档中的 Jira 遗留引用; tests: not needed - 文案/历史边界清理, 用 `rg -n "jira|Jira|JIRA"` 和 `pnpm harness:check` 验证; verify: `rg -n "jira|Jira|JIRA" .agents docs scripts tests AGENTS.md package.json --glob "!docs/works/_archive/**" --glob "!docs/friction/_archive/**"`。

## 验证记录

- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts` - 3 files / 35 tests passed。
- `pnpm typecheck:node` - passed。
- `pnpm harness:check` - all checks passed。
- `pnpm harness:projects:check` - all project statuses match local task state。
- `pnpm test tests/harness/check.test.ts` - 1 file / 23 tests passed。
- `pnpm harness:check` - test evidence rule check passed。
- `pnpm test tests/harness/projects.test.ts` - RED: 5 expected failures before implementation; GREEN: 1 file / 12 tests passed。
- `pnpm typecheck:node` - passed after `harness-projects ensure/start` implementation。
- `pnpm harness:check` - passed after GitHub Issue task ID workflow/template contract update。
- `pnpm test tests/harness/check.test.ts` - RED: 3 expected failures before implementation; GREEN: 1 file / 26 tests passed。
- `pnpm harness:check` - passed after active works were renamed to `gh-{number}` and INDEX metadata was rewritten。
- `node scripts/harness-projects.mjs check --strict` - all project statuses match local task state。

## GitHub Issue 迁移记录

- Converted Project draft items for local active works to GitHub Issues #2-#9.
- Local active tracked works now use `task_id: GH-{number}` and `docs/works/{date}-gh-{number}-{summary}/`.

## Polish 后续实现记录

- 用户确认继续处理 GitHub Issue/Project 任务 ID 迁移。当前任务从 `polish` 回到 `implement`, 只处理当前 harness 工作流本身。
