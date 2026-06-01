# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 添加 DevTools 自动打开判定单元测试。verify: `pnpm vitest run tests/unit/devtools.test.ts` 先失败, 原因为 `src/main/devtools.ts` 缺失。
- [x] 任务 2: 添加 `src/main/devtools.ts`, 并接入 `src/main/index.ts`。verify: `pnpm vitest run tests/unit/devtools.test.ts` 通过, 3 个测试通过。
- [x] 任务 3: 跑 `pnpm typecheck:node` 与 `pnpm harness:check`, 冷启动 agent-owned dev 实例确认应用仍可打开。verify: `pnpm typecheck:node` 通过; `pnpm harness:check` 通过; `pnpm dev:agent start --id devtools-auto-open-verify --json` 启动成功, 看到 agent Electron 主进程 PID 506012, 已 `pnpm dev:agent stop devtools-auto-open-verify --json`; `guard after` 确认用户 dev 进程 PID 204932 / 322572 仍在。

## verify 回写

- 2026-05-31: 目标测试 `pnpm vitest run tests/unit/devtools.test.ts` 通过, 3 个测试通过。
- 2026-05-31: `pnpm typecheck:node` 通过。
- 2026-05-31: `pnpm harness:check` 通过。
- 2026-05-31: 真实冷启动使用 agent-owned 实例验证, 没有清理或复用用户 dev。
- 2026-05-31: 收口检查 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm harness:check` 均通过。`pnpm test` 结果为 43 个 test files / 274 个 tests 通过; 输出中有既有 Recharts 容器尺寸 warning, 不影响通过结果。
