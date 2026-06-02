# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- CLI:
  - `pnpm dev:agent screenshot <id> [--output <path>] [--mode print-window|screen] [--json]`
- `parseArgs()` 输出:
  - `command: 'screenshot'`
  - `id`
  - `output?: string`
  - `mode?: 'print-window' | 'screen'`
- 成功结果:
  - `status: 'screenshot'`
  - `id`
  - `electronPid`
  - `outputPath`
  - `mode`
  - `windowHandle`
  - `bounds: { left, top, width, height }`
  - `fileSize`

## 模块结构 / 组件拆分

- `scripts/agent-dev-core.mjs`
  - `usageText()` 增加 screenshot 命令。
  - `parseArgs()` 增加 `--output` / `--mode` 解析。
  - 新增 `isAgentOwnedElectronMainProcess()` / `findAgentOwnedElectronMainProcess()`。
  - 新增 `captureScreenshot()`:
    - 校验 id、state、owned running state。
    - 仅 Windows 支持; 非 Windows 报错。
    - 找到 agent-owned Electron 主进程。
    - 默认输出到 `instanceDir(context, id)/screenshot.png`。
    - 调用 `runWindowsScreenshotHelper()`。
  - 新增 `runWindowsScreenshotHelper()`:
    - 用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ...` 运行 C# helper。
    - PowerShell env 传 `BERTH_SCREENSHOT_PID` / `BERTH_SCREENSHOT_OUTPUT` / `BERTH_SCREENSHOT_MODE`。
    - C# helper 枚举目标 pid 可见窗口, 取 DWM bounds, 用 `PrintWindow` 或 `CopyFromScreen` 保存 PNG, 返回 JSON。
  - `runCli()` 增加 screenshot 分支, `formatResult()` 增加人类可读输出。
- `tests/unit/agent-dev-core.test.ts`
  - 覆盖 usage / parse args。
  - mock `listProcesses`、`spawnSync`、`isPidRunning`、`getProcessCommandLine` 测 screenshot 成功。
  - 覆盖找不到 Electron 主进程、非 Windows平台 / 无效 mode。

## 界面质量与交互验收

非产品 UI 任务。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| CLI 解析和 usage | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| agent-owned Electron 主进程识别 | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| Windows helper 调用与结果映射 | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| 找不到窗口/不支持平台错误路径 | unit | tests/unit/agent-dev-core.test.ts | pnpm test tests/unit/agent-dev-core.test.ts |  |
| 真实 agent-owned 窗口截图 | manual | docs/works/2026-06-02-gh-32-dev-agent-windows-screenshot-helper/03-PLAN.md | `pnpm dev:agent screenshot ... --json` | 真实 Windows 窗口句柄和屏幕渲染需 runtime verify。 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| screenshot CLI 契约 | 1, 2, 5 |
| Electron 主进程识别和 owned 校验 | 3 |
| Windows helper | 4, 5 |
| 单元测试和 runtime verify | 6 |
