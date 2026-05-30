# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增 dev-only agent 实例标记, 不进入 IPC 或持久业务数据:

- CLI arg: `--berth-agent-instance=<id>`
- env: `BERTH_AGENT_INSTANCE_ID=<id>` 作为脚本传递和兜底
- id 只允许归一化为 `[A-Za-z0-9._-]`, 作为 profile/state 目录名的一部分

Agent 实例 state 由 helper 写到系统临时目录, 不进仓库:

```ts
type AgentDevState = {
  id: string
  pid: number
  startedAt: string
  cwd: string
  profileDir: string
  logPath: string
}
```

普通 `pnpm dev` 不带上述标记, 行为不变。

## 模块结构 / 组件拆分

1. `src/main/dev-instance.ts`
   - 提供纯函数解析 agent id、归一化 id、决定是否请求普通单实例锁。
   - 在 dev agent 模式下创建系统临时 profile, 调用 `app.setPath('userData', profileDir)` 和 `app.setPath('sessionData', profileDir)`。
   - 只在 `is.dev === true` 且存在 agent id 时生效；生产/普通 dev 不变。

2. `src/main/index.ts`
   - 在 `requestSingleInstanceLock()` 之前调用 dev profile 配置。
   - 普通 dev/prod: 继续请求单实例锁。
   - agent dev: 跳过普通单实例锁, 允许与用户 dev 并行；进程归属由 helper state 管。

3. `scripts/agent-dev.mjs`
   - `start [--id <id>]`: 启动 detached `electron-vite dev -- --berth-agent-instance=<id> --user-data-dir=<profileDir>`, 写 state/log, 返回 id/pid/profile/log。
   - `stop <id>`: 读取 state, 只终止该 pid 的 process tree, 删除该 id 的 state/profile。
   - `status [id]`: 列出 state 与 pid 存活状态, 供验收前后核对。
   - Windows 用 `taskkill /PID <pid> /T /F` 只按 state pid 杀进程树；macOS/Linux 用 detached process group。

4. `package.json`
   - `dev` 改为 `electron-vite dev --watch`, 让用户自己的 dev 进程在 main/preload 改动时自刷新。
   - 新增 `dev:agent`: `node scripts/agent-dev.mjs`。

5. `.agents/workflow/verify.md`
   - 删除“冷启动先清零仓库所有 Electron/electron-vite 进程”的规则。
   - 改为: 先观测用户 dev, 不复用也不清理；需要真实应用时用 `pnpm dev:agent start`; 完成后 `pnpm dev:agent stop <id>`；最后用 `status` 和系统进程表确认用户 dev 仍在。

## 测试策略

- `tests/unit/dev-instance.test.ts`: 覆盖普通 dev/prod 不启用 agent profile、agent id 解析/归一化、agent 模式设置 userData/sessionData、agent 模式不请求普通单实例锁。
- `node scripts/agent-dev.mjs status`: 验证 helper 可执行且不会启动/清理任何进程。
- `pnpm test -- tests/unit/dev-instance.test.ts`: 针对主进程 helper。
- `pnpm harness:check`: 验证任务态与 workflow 文档结构；若被其他 agent 的未完成任务态阻塞, 在当轮说明。
- 实测验收:
  1. 记录用户 dev PID。
  2. `pnpm dev:agent start --id <id>` 启动 agent 实例。
  3. 确认 command line 带 `--berth-agent-instance=<id>` 和独立 `--user-data-dir`。
  4. `pnpm dev:agent stop <id>` 后, agent pid/process tree 消失。
  5. 用户 dev PID 仍存活。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| agent id + isolated profile | 1 |
| 普通 dev 保持单实例锁 | 2 |
| `dev:agent start/stop/status` | 3, 4 |
| 普通 `dev --watch` + verify 文档改为 agent-owned lifecycle | 3, 5 |
| 单元测试 + helper status + harness check | 6 |
| 只暂存本任务文件 | 7 |
