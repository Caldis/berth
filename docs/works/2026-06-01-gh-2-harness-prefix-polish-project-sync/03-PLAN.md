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
- [x] 任务 11: 将 GitHub Issue 任务 ID 契约写入 workflow / 模板 / 入口规则, 取代旧企业 ticket 字段; tests: not needed - 纯流程文档与模板契约改动, 由 `pnpm harness:check` 校验; verify: `pnpm harness:check`。
- [x] 任务 12: 扩展 `harness-projects` 支持 issue 绑定、Project ensure/start 和严格审计; tests: `pnpm test tests/harness/projects.test.ts`; verify: `pnpm typecheck:node`。
- [x] 任务 13: 扩展 `harness-check` 校验 active works 的 `task_id` / `issue` / `gh_project.item_id` 与 `gh-{number}` 目录名; tests: `pnpm test tests/harness/check.test.ts`; verify: `pnpm harness:check`。
- [x] 任务 14: 迁移当前 active works 到 `{date}-gh-{number}-{desc}` 并回写 GitHub Issue/Project 元数据; tests: not needed - 元数据和目录迁移, 用 `pnpm harness:check` 与 `node scripts/harness-projects.mjs check --strict` 验证; verify: `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`。
- [x] 任务 15: 扫描并清理非历史文档中的旧企业 ticket 遗留引用; tests: not needed - 文案/历史边界清理, 用旧字段关键字扫描和 `pnpm harness:check` 验证; verify: active paths keyword scan excluding `_archive` and `docs/superpowers` history。
- [x] 任务 16: 处理 Superpowers 与 harness 的流程冲突, 写入默认 harness、受控借鉴、禁止新增 active Superpowers plan/spec 和并行自主决策规则; tests: `pnpm test tests/harness/check.test.ts`; verify: `pnpm harness:check`, `pnpm typecheck:node`。
- [x] 任务 17: 引入有序 action id, 重命名 workflow 源文件与 skill 分发产物, 并迁移 active friction 命名; tests: `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts`; verify: `pnpm harness:sync -- --check`, `pnpm harness:check`。
- [x] 任务 18: 新增 issues 收敛动作 `5.2-issues` 与 `pnpm harness:issues` 清单命令; tests: `pnpm test tests/harness/issues.test.ts`; verify: `pnpm typecheck:node`。
- [x] 任务 19: 在 archive 流程加入 friction/issues 堆积提醒, 但不自动执行可选清理动作; tests: `pnpm test tests/harness/check.test.ts`; verify: `pnpm harness:check`。

## 验证记录

- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts` - 3 files / 35 tests passed。
- `pnpm typecheck:node` - passed。
- `pnpm harness:check` - all checks passed。
- `pnpm harness:projects:check` - all project statuses match local task state。
- `pnpm test tests/harness/check.test.ts` - 1 file / 23 tests passed。
- `pnpm harness:check` - test evidence rule check passed。
- `pnpm test tests/harness/projects.test.ts` - RED: 5 expected failures before implementation; GREEN: 1 file / 12 tests passed。
- `pnpm typecheck:node` - passed after `harness-projects ensure/start` implementation。
- `pnpm test tests/harness/projects.test.ts` - RED: archive missing item_id test failed before fix; GREEN: 1 file / 13 tests passed。
- `pnpm typecheck:node` - passed after archive missing item_id guard。
- `pnpm harness:check` - passed after GitHub Issue task ID workflow/template contract update。
- `pnpm test tests/harness/check.test.ts` - RED: 3 expected failures before implementation; GREEN: 1 file / 26 tests passed。
- `pnpm harness:check` - passed after active works were renamed to `gh-{number}` and INDEX metadata was rewritten。
- `node scripts/harness-projects.mjs check --strict` - all project statuses match local task state。
- active paths旧字段关键字扫描 - no matches outside `_archive` and `docs/superpowers` historical design records。
- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts` - 3 files / 45 tests passed。
- `pnpm typecheck:node` - passed。
- `pnpm harness:check` - all checks passed。
- `node scripts/harness-projects.mjs check --strict` - all project statuses match local task state。
- 旧前缀扫描 - only intentional legacy cleanup code/tests and historical work docs remain; no `opsw` hits。
- `pnpm test tests/harness/check.test.ts` - RED: 3 expected Superpowers policy failures before implementation; GREEN: 1 file / 29 tests passed。
- `pnpm harness:check` - passed after Superpowers flow guard docs and checker update。
- `pnpm typecheck:node` - passed after `checkSuperpowers` implementation。
- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts` - 3 files / 48 tests passed after Superpowers guard commit。
- `pnpm typecheck:node` - passed after Superpowers guard commit。
- `pnpm harness:check` - all checks passed after Superpowers guard commit。
- `node scripts/harness-projects.mjs check --strict` - all project statuses match local task state after Superpowers guard commit。
- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/issues.test.ts` - RED: 13 expected action/issues failures before implementation; GREEN: 3 files / 38 tests passed。
- `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/issues.test.ts tests/harness/stats.test.ts` - 4 files / 42 tests passed after action rename and issues command。
- `pnpm harness:sync -- --check` - distribution in sync after action-id skill generation。
- `pnpm harness:check` - all checks passed after workflow/action rename。
- `pnpm typecheck:node` - passed after `harness-issues` implementation。
- `pnpm harness:issues` - active=10 resolved=2; listed active docs/issues backlog for optional `harness-5.2-issues` cleanup。

## 有序 action 与 issues 收敛补充记录

- 用户要求 workflow 步骤和动作带顺序前缀, 可选步骤用关联步骤的子编号。
- 用户要求 issues 也有与 `optimization` 对应的收敛动作。
- 用户要求 archive 后提醒本次产生或关联的 friction / issues, 但不自动执行清理。

## GitHub Issue 迁移记录

- Converted Project draft items for local active works to GitHub Issues #2-#9.
- Local active tracked works now use `task_id: GH-{number}` and `docs/works/{date}-gh-{number}-{summary}/`.

## Superpowers 冲突处理记录

- 用户确认后续默认走 harness workflow; Superpowers 只能作为方法参考, 不能接管任务状态、目录或执行问答。
- `brainstorming` 可吸收到 design, 但必须限流到少量关键问题。
- 并行与顺序执行由 Agent 按文件范围、模块边界和测试耦合度自行判断, 不再要求用户选择 subagent 或主 session。

## Polish 后续实现记录

- 用户确认继续处理 GitHub Issue/Project 任务 ID 迁移。当前任务从 `polish` 回到 `implement`, 只处理当前 harness 工作流本身。
