# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 为 guard after 的 Electron 主进程重启场景添加失败测试。verify: `pnpm vitest run tests/unit/agent-dev-core.test.ts` 失败, 失败点为当前 `evaluateGuardAfter` 把重启当 missing。
- [x] 任务 2: 更新 `evaluateGuardAfter(...)`, 允许同一 dev server 父进程下的新用户 Electron 主进程替代旧 PID。verify: `pnpm vitest run tests/unit/agent-dev-core.test.ts` 通过, 13 个测试通过。
- [x] 任务 3: 跑 node typecheck、harness 检查和必要的全量测试, 并更新任务态到 verify。verify: `pnpm typecheck:node` 通过; `pnpm harness:check` 通过; `pnpm dev:agent guard before/after --id guard-restart-fix-verify --json` 通过, 返回 `restarted: []`。

## verify 回写

- 2026-05-31: 目标测试 `pnpm vitest run tests/unit/agent-dev-core.test.ts` 通过, 13 个测试通过。
- 2026-05-31: `pnpm typecheck:node` 通过。
- 2026-05-31: `pnpm harness:check` 通过。
- 2026-05-31: 实测 `pnpm dev:agent guard before/after --id guard-restart-fix-verify --json` 通过; 当前用户 dev 进程 PID 204932 / 322572 被保护, 未被修改。
- 2026-05-31: 收口检查 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm harness:check` 均通过。`pnpm test` 结果为 43 个 test files / 276 个 tests 通过; 输出中有既有 Recharts 容器尺寸 warning, 不影响通过结果。
