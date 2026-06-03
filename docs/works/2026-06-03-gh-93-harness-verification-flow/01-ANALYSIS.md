# 需求分析 (Explore 产物)

## 现状理解

当前验证耗时主要来自三类重复或不稳定步骤:
- `pnpm test` 全量 85 files / 615 tests, 单次约 13 秒; 若目标测试、full test、prepush 重复跑, 会被放大。
- Electron 视觉验收需要启动 agent、CDP 操作、截图和 guard, 适合 UI 任务, 不适合所有 harness 小改都全量执行。
- `node scripts/harness-projects.mjs check --strict` 会检查全部 active works, 无关任务的 Project 字段漂移会阻塞当前任务级验证。

本任务先处理两个最高收益点:
- Windows 下 `pnpm harness:prepush` 因 `spawn('pnpm.cmd')` 报 `spawn EINVAL`, 导致并行 prepush 无法工作。
- Project strict check 缺少当前任务范围模式。

## 官方依据

Node.js child_process 文档说明: Unix/Linux/macOS 下直接执行文件可以避免 shell, 效率更高; Windows 下 `.bat` / `.cmd` 文件不能独立执行, 可通过 `cmd.exe` 并把脚本作为参数启动。来源: https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows

因此本任务的跨平台边界是:
- win32: prepush 任务通过 `cmd.exe /d /s /c pnpm.cmd <script>` 执行, 避开 `.cmd` 直启问题。
- darwin/linux: 继续 `spawn('pnpm', args)`, 不引入 shell。

## 关联与依赖

- `scripts/harness-prepush.mjs`
  - `pnpmCommand('win32')` 返回 `pnpm.cmd`。
  - `runTask()` 对所有平台都直接 `spawn(command, task.args, ...)`。
  - 结果: Windows 本机可复现 `spawn EINVAL`。
- `tests/harness/prepush.test.ts`
  - 目前只断言 Windows 返回 `pnpm.cmd`, 没覆盖实际 spawn 参数。
- `scripts/harness-projects.mjs`
  - `checkProjects(root)` 固定遍历 `docs/works` 和 `docs/works/_archive`。
  - `--strict` 会检查全部 active work 的 issue / Project item / custom fields。
  - 缺少 `--work <task-dir>` 只检查当前 active task 的入口。
- `tests/harness/projects.test.ts`
  - 已覆盖 `auditTasks(root, ..., { strict })`, 但没有按 work dir 过滤的 helper。

## 任务分类与 debt 校准

- type / maintenance.subtype: `maintenance` / `tooling-ci`。
- source.kind / refs: `user-request`, GH-93。
- debt estimate 修正: 保持 `incurred=1, repaid=4, net=-3`。
- scope / risk / areas / confidence: `module` / `medium` / `tooling-ci,testability` / `medium`。
- revision: 暂不需要。

## 验收标准

1. Windows `pnpm harness:prepush` 不再因 `spawn EINVAL` 提前退出; 若失败, 输出真实失败任务。
2. macOS/Linux prepush 测试确认仍 direct spawn `pnpm`。
3. `harness-projects check --strict --work docs/works/<task>` 只检查指定任务, 不被其他 active work 漂移阻塞。
4. 默认 `harness-projects check --strict` 行为保持全仓严格检查。

## 界面质量与交互验收

不适用。本任务只改 Node harness 脚本和测试, 不改 renderer UI。

## 未决问题

无。
