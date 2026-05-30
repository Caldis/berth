# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 增加 `src/main/dev-instance.ts` 与 `tests/unit/dev-instance.test.ts`, 验证 agent id 解析、profile 设置和单实例锁决策。verify: `pnpm test -- tests/unit/dev-instance.test.ts` 通过。
- [x] 任务 2: 在 `src/main/index.ts` 接入 dev agent profile/lock 决策。verify: `pnpm typecheck:node` 通过。
- [x] 任务 3: 增加 `scripts/agent-dev.mjs`, 将 `package.json` 的 `dev` 改为 `--watch`, 并新增 `dev:agent` 入口。verify: `node scripts/agent-dev.mjs status` 通过, 返回空实例列表。
- [x] 任务 4: 更新 `.agents/workflow/verify.md`, 禁止按仓库路径清零进程, 改为 agent-owned start/stop/status。verify: 文档包含 `pnpm dev:agent start` 和 `pnpm dev:agent stop`。
- [x] 任务 5: 实测启动/停止 agent 实例, 核对用户 dev PID 仍存活。verify: `codex-20260530-dev-instance` 启动 PID 527856 / Electron PID 453984; stop 后 agent state 空, profile 目录不存在, 用户 dev PID 320656/307860 仍存活。
- [x] 任务 6: 跑 `pnpm harness:check` 与相关门禁。verify: `pnpm harness:check` 通过。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
