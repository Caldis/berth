# BUG 快照 (只读)

来源: 用户对话与 `docs/friction/20260531-verify-user-dev-electron-restart-guard.md`

## 复现步骤

1. 用户本地已有普通 `pnpm dev` / `npm run dev`。
2. verify 前执行 `pnpm dev:agent guard before --id <id>`。
3. verify 期间普通用户 dev 的 Electron 子进程被 `electron-vite dev --watch` 正常重启, dev server 父进程仍在, 同一父进程下出现新的 Electron 主进程。
4. verify 后执行 `pnpm dev:agent guard after --id <id>`。

## 期望 vs 实际

- 期望: dev server 父进程仍存活且有替代 Electron 主进程时, guard 认为用户 dev 仍受保护, 不报错。
- 实际: guard 只按快照 PID 判断, 旧 Electron 子进程 PID 消失后报 `Protected user dev processes exited: <pid>`。
