# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- CLI 参数:
  - `--debug-port <port>`
  - `--debug-port=<port>`
  - `--remote-debugging-port <port>`
  - `--remote-debugging-port=<port>`
- `parseArgs()` 输出:
  - `debugPort?: number`
- state / status 数据新增:
  - `debugPort?: number`
  - `devtoolsUrl?: string`
- `devtoolsUrl` 格式固定为 `http://127.0.0.1:<debugPort>`。它是人工和脚本的入口提示, 不做端口探测。

## 模块结构 / 组件拆分

- `scripts/agent-dev-core.mjs`
  - 新增 `normalizeDebugPort(value)`。
  - `parseArgs()` 解析两组等价端口参数。
  - `start()` 在 Electron 参数尾部追加 `--remote-debugging-port=<port>`。
  - `start()` 写入 `debugPort` / `devtoolsUrl` 到 state。
  - `formatResult()` 在 started 输出中展示 debug port URL。
- `tests/unit/agent-dev-core.test.ts`
  - 增加参数解析测试。
  - 增加无效端口测试。
  - 扩展 start/spawn/state 测试, 确认 Electron 参数和 state。
  - 扩展 format 测试。

## 界面质量与交互验收

非 UI 任务。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 解析 `--debug-port` / `--remote-debugging-port` | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| 拒绝无效端口 | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| start 传递 Electron remote debugging 参数并写 state | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| started/status 输出包含调试入口 | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| CLI 解析与端口规范化 | 1, 2 |
| start 参数透传与 state 输出 | 3, 4, 5 |
| 单元测试与 harness 检查 | 6 |
