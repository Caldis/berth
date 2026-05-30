# 需求分析 (Explore 产物)

## 现状理解

本问题影响本地 dev / harness 验收流程, 主线涉及 Electron 主进程、`electron-vite dev` 生命周期、工作流文档和进程清理约束, 不涉及 renderer UI、preload API 或 IPC 契约。

当前实现与现场事实:

- `package.json` 的 `dev` 脚本是 `electron-vite dev`。
- electron-vite 官方文档说明 `dev` 会构建 main/preload, 启动 renderer dev server, 最后启动 Electron app；`--` 后的参数会传给 Electron app。
- `node_modules/electron-vite/dist/cli.js` 显示只有传 `--watch` 时才会给 main/preload build 设置 watch；当前 `dev` 脚本未传 `--watch`, renderer 可 HMR, 但 main/preload 改动不会由用户 dev 自动重启。
- `node_modules/electron-vite/dist/chunks/lib-7y7CgM8M.js` 中 main rebuild 后只会 `ps.kill()` 自己启动的 Electron 子进程, 这本身不是误杀用户 dev 的来源。
- `src/main/index.ts` 当前无条件调用 `app.requestSingleInstanceLock()`。Electron 官方文档说明第二实例拿不到锁时应立即退出, 并把参数传给第一实例。
- `.agents/workflow/verify.md` 当前在冷启动场景要求按仓库路径批量 `pkill` / 清零 Electron 和 electron-vite 进程, 没有区分用户手动启动的 dev 与 Agent 启动的验收实例。
- 当前机器已经有用户 dev 进程在跑: electron-vite 父进程 PID 320656, Electron 主进程 PID 307860, command line 为 `electron-vite.js dev` / `electron.exe .`。后续实现与验证不得清理这些进程。

冲突来源:

1. 普通用户 dev 与 Agent 验收 dev 使用同一个 Electron app 身份。单实例锁会让第二个 app 退出或聚焦已有窗口, Agent 难以拥有独立可控窗口。
2. harness verify 的冷启动规则用路径匹配批量杀进程, 它只能表达“这个仓库的进程”, 不能表达“这个 Agent 本轮启动的进程”。
3. 缺少一个稳定的 agent-owned 实例标记、隔离 profile 和 pid/state 记录, 因此验收结束时无法只清理自己管理的进程树。
4. 用户 dev 实例刷新最新内容这件事应依赖用户自己的 `electron-vite dev --watch` watcher/HMR。Agent 不应接管或重启用户实例；只要不误杀它, renderer HMR 和 main/preload rebuild 会由用户自己的 dev 进程处理。

Primary sources:

- Electron `app.requestSingleInstanceLock()` / `second-instance`: https://www.electronjs.org/docs/latest/api/app
- electron-vite CLI / dev lifecycle / app arguments: https://electron-vite.org/guide/cli.html, https://electron-vite.org/guide/dev

## 关联与依赖

- `src/main/index.ts`: 单实例锁入口, 也是配置 dev-only agent profile 的最小位置；必须在 `app.whenReady()` 前完成 profile/lock 决策。
- `package.json`: 需要给 Agent 一个明确入口, 避免未来继续手写 `pnpm dev` + 宽泛 kill。
- `scripts/`: 适合放 agent dev lifecycle helper, 记录 owner id / pid / profile / log, 并提供 scoped stop/status。
- `.agents/workflow/verify.md`: 必须改掉“清零仓库所有 Electron 进程”的规则, 改为 agent-owned start/stop。
- `tests/e2e/*.ts`: 已经使用临时 `--user-data-dir` 启动隔离 Electron, 可作为隔离思路参考, 但不能替代真实 `electron-vite dev` 的进程生命周期规则。

## 验收标准

1. Agent 启动验收实例时, 该实例带有稳定 agent owner id, 使用独立 user data/session data profile, 且不占用普通 dev 的单实例锁。
2. 普通 `pnpm dev` / `npm run dev` 保持单实例行为: 用户重复启动仍不会多开普通窗口。
3. Agent 验收流程有明确命令启动/停止自己的 dev 实例, stop 只作用于该命令记录的 pid/process tree, 不使用按仓库路径清零的 kill 命令。
4. 用户已有 dev 进程在 Agent 验收前后仍应存活；本轮现场进程 PID 320656/307860 不能被误杀。
5. 用户 dev 实例刷新最新内容依赖其自身 electron-vite `--watch`/HMR, 文档中必须说明 Agent 不主动重启或清理用户 dev。
6. 新增逻辑有可测试的纯函数或脚本 dry-run/status 检查覆盖；至少跑针对性单测、`pnpm harness:check`, 并说明是否跑全量门禁。
7. 只修改本任务相关文件, 不暂存或提交当前工作区中其他 agent 的未提交改动。

## 未决问题

无。用户的期望已经足够明确: Agent 自己管理自己的实例, 不接管用户 dev。
