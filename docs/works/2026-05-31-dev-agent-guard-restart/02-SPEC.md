# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- `evaluateGuardAfter(snapshot, currentProcesses)` 继续返回 `{ ok, missing }`。
- 新增 `restarted` 字段, 记录快照中已被替代的 Electron 主进程:
  - `previous`: 快照中的旧进程。
  - `replacement`: 当前进程表中同一 dev server 父进程下的新 Electron 主进程。

## 模块结构 / 组件拆分

- 保留 `collectProtectedUserDevProcesses(...)` 与 `isProtectedUserDevProcess(...)`。
- 在 `evaluateGuardAfter(...)` 内区分两类快照进程:
  - dev server 父进程: PID 缺失即 missing。
  - Electron 主进程: PID 缺失时, 查找 `parentPid` 相同且符合 `isProtectedUserDevProcess(...)` 的当前 Electron 主进程; 找到则计入 restarted, 不计入 missing。

## 测试策略

- 先补一个失败测试, 模拟 Electron 子进程 PID 变化但同父进程下有替代主进程。
- 补负向测试: agent-owned 替代进程不算替代; 无替代进程时仍失败。
- 跑 `pnpm vitest run tests/unit/agent-dev-core.test.ts`、`pnpm typecheck:node`、`pnpm harness:check`。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| dev server 父进程缺失仍失败 | 1 |
| Electron 主进程被同父新主进程替代时通过 | 2 |
| Electron 主进程缺失且无替代时失败 | 3 |
| agent-owned 进程不能作为替代 | 4 |
| 单测/typecheck/harness 检查 | 5 |
