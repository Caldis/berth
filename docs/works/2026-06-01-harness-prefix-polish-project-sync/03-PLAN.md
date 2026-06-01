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

## 验证记录

- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts` - 3 files / 35 tests passed。
- `pnpm typecheck:node` - passed。
- `pnpm harness:check` - all checks passed。
- `pnpm harness:projects:check` - all project statuses match local task state。
