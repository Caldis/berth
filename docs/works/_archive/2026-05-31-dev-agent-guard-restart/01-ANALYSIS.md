# 需求分析 (Explore 产物)

## 现状理解

- `pnpm dev:agent guard before` 会把普通用户 dev 的 electron-vite 父进程和 Electron 主进程写入 guard 快照。
- `isProtectedUserDevProcess(...)` 会排除带 `--berth-agent-instance=` 的 agent-owned 实例和带 `--type=` 的 Electron helper 子进程。
- `evaluateGuardAfter(...)` 当前只检查快照 PID 是否仍存在。用户 dev 使用 `electron-vite dev --watch` 时, main/preload rebuild 可能使 Electron 主进程 PID 变化, 但 dev server 父进程仍在。
- 已有 friction 记录确认: Electron 子 PID 消失但同一 dev server 父进程下有新的 Electron 主进程时, 这是正常重启, 不应视为用户 dev 被误杀。

## 关联与依赖

- 改动范围在 `scripts/agent-dev-core.mjs` 与 `tests/unit/agent-dev-core.test.ts`。
- 不改普通 `pnpm dev`、`pnpm dev:agent start/stop/status` 的启动或停止策略。
- 不改变 agent-owned 进程排除规则: 带 `--berth-agent-instance=` 的进程仍不能作为用户 dev 替代进程。

## 验收标准

1. dev server 父进程缺失时, `guard after` 仍失败。
2. 用户 dev Electron 主进程缺失, 但同一父进程下有新的无 `--type=`、无 `--berth-agent-instance=` Electron 主进程时, `guard after` 通过并记录 restart。
3. 用户 dev Electron 主进程缺失且无替代主进程时, `guard after` 失败。
4. agent-owned Electron 主进程不能作为普通用户 dev 的替代进程。
5. 目标单测、node typecheck 与 harness 检查通过。

## 未决问题

无。
