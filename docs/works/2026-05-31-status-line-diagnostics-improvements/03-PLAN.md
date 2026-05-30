# 任务清单

- [x] 任务 1: 稳定当前 Status Line 基线, 确认旧改动是否已进入 HEAD。
- [x] 任务 2: 提交本任务 harness 文档。
- [x] 任务 3: 实现 effective / overridden 分组展示。
- [x] 任务 4: 实现健康检查状态和诊断列表。
- [x] 任务 5: 实现 command 脱敏展示。
- [x] 任务 6: 补 renderer 测试。
- [x] 任务 7: 跑目标测试、typecheck、harness, 回写 verify。

## verify 回写

通过:

- `pnpm test -- tests/renderer/status-line-section.test.tsx tests/unit/codex-config-parser.test.ts`
- `pnpm typecheck:web`
- `pnpm harness:check`

限制:

- `pnpm typecheck` 在当前 dirty worktree 中失败于并行任务加入的未使用 import: `groupEnvVars`、`summarizePermissionRules`、`EnvVarGroupSection`。这些符号位于 `src/renderer/src/pages/capabilities.tsx` 的未提交非状态栏改动中, 不属于本任务提交树。
