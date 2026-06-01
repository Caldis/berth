# 工程摩擦记录

## 发生阶段

verify

## 现象

真实 Electron 视觉验收前执行 `pnpm dev:agent guard before --id asset-guidance-verify`, 记录到用户 dev 父进程 PID 484524 和其 Electron 子进程 PID 167776。验收结束后本轮 agent-owned 实例可通过 `pnpm dev:agent stop asset-guidance-verify` 正常停止, 但 `pnpm dev:agent guard after --id asset-guidance-verify` 报 `Protected user dev processes exited: 167776`。

复查进程表后, 用户 dev 父进程 PID 484524 仍在运行, 且已有新的 Electron 子进程 PID 184464。也就是说, 用户 dev 的 Electron 子进程在 watch/HMR 过程中被重启, guard 只按原子进程 PID 判断, 因此把正常重启也判成退出。

## 工程师介入动作

停止本轮 agent-owned 实例后, 复查 `Win32_Process` 中的 `electron-vite dev --watch` 父进程和新的 `electron.exe .` 子进程, 确认没有遗留 agent-owned 实例, 也没有把用户 dev 父进程停掉。随后清理本轮 guard 临时文件。

## 应沉淀的上下文或规则

Windows 下用户 dev 使用 `electron-vite dev --watch` 时, Electron 子进程 PID 可能在验证期间变化。`guard after` 看到原 Electron 子 PID 消失时, 需要同时检查受保护的 dev 父进程是否仍在, 以及是否生成了同一父进程下的新 Electron 主进程。

## 建议的流程改进

`dev:agent guard after` 可以把受保护进程分成 dev server 父进程和 Electron 子进程两类。父进程消失应视为高风险; Electron 子进程消失但同一父进程下出现新的无 `--type=` Electron 主进程时, 应报告为 restart 而不是直接失败。
