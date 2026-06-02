# 需求分析 (Explore 产物)

## 现状理解

- `pnpm dev:agent` 由 `package.json` 指向 `scripts/agent-dev.mjs`, 核心逻辑在 `scripts/agent-dev-core.mjs`。
- `start()` 当前通过 `electron-vite dev --watch -- ...` 启动独立实例, 已传入:
  - `--berth-agent-instance=<id>`
  - `--user-data-dir=<profileDir>`
- state 文件写在系统临时目录下的 `berth-agent-dev/{id}.json`, `status()` 通过 `describeState()` 返回运行状态、owned 判断和命令行。
- 测试已集中在 `tests/unit/agent-dev-core.test.ts`, 可直接覆盖 CLI 参数解析、spawn 参数、state 写入和格式化输出。

## 关联与依赖

- 官方 electron-vite development 文档说明可以在 CLI 后追加 `--`, 其后的参数会传给 Electron: https://electron-vite.org/guide/dev
- Electron 官方 command line switches 文档列出 `--remote-debugging-port=<port>`: https://www.electronjs.org/docs/latest/api/command-line-switches/
- 端口能力只用于 agent-owned dev 实例; 不改变普通 `pnpm dev`, 不改变用户 dev 的单实例保护逻辑。
- `commandOwnsAgentDevState()` 当前通过 command line 检查 `--berth-agent-instance=<id>`、仓库路径和 `electron-vite`, 新增调试端口不应影响 ownership 判断。

## 验收标准

1. `pnpm dev:agent start --id <id> --debug-port <port>` 和 `--remote-debugging-port <port>` 都能解析为同一字段。
2. 端口只接受 1 到 65535 的整数; 空值、非数字、小数、0、65536 等在 spawn 前报错。
3. `start()` 传给 electron-vite 的 Electron 参数包含 `--remote-debugging-port=<port>`。
4. state、`status --json` 和普通启动输出能看见 `debugPort` 与本地 DevTools 地址。
5. 未传端口时, 行为和现有 `dev:agent start` 保持一致。
6. 目标单元测试通过, 全局 harness 检查通过。

## 界面质量与交互验收

非 UI 任务。

## 未决问题

无。
