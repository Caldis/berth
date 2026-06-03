# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- `scripts/harness-prepush.mjs`
  - 新增内部 helper: 根据平台生成 spawn command / args。
  - `win32` 返回 `command='cmd.exe'`, `args=['/d', '/s', '/c', 'pnpm.cmd', ...task.args]`。
  - 非 `win32` 返回 `command='pnpm'`, `args=task.args`。
  - `runTask()` 继续接收测试注入的 `spawn`, 并允许测试通过 `platform` 验证不同平台。
- `scripts/harness-projects.mjs`
  - `auditTasks(root, itemsJson, options)` 新增 `workDir` 可选项。
  - 未传 `workDir` 时保持原行为: active + archive 全部检查。
  - 传 `workDir` 时只检查该任务目录, 不扫描 archive。
  - CLI 新增 `check --work <task-dir>`; 可与 `--strict` 组合。

## 任务分类与 debt

- type / maintenance.subtype: `maintenance` / `tooling-ci`。
- source.kind / refs: `user-request`, GH-93。
- debt.estimate: `incurred=1, repaid=4, net=-3, scope=module, risk=medium, areas=tooling-ci,testability, confidence=medium`。
- debt.final 预期: 若实现保持窄范围, 与 estimate 一致。
- revisions: 不需要。
- Project 字段同步: 新任务已绑定 Project 6, item status `In Progress`。

## 模块结构 / 组件拆分

- 保持脚本边界:
  - prepush 改动只在 `scripts/harness-prepush.mjs`。
  - Project 检查范围改动只在 `scripts/harness-projects.mjs`。
- 不改 package scripts 名称。
- 不改默认 `harness:projects:check` 与 `check --strict` 语义。

## 界面质量与交互验收

不适用。本任务不改 renderer UI。

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Windows prepush 通过 `cmd.exe` 调 `pnpm.cmd`, macOS/Linux 保持 direct spawn `pnpm` | harness unit | `tests/harness/prepush.test.ts` | `pnpm vitest run tests/harness/prepush.test.ts` |  |
| `harness-projects check --work` 只检查指定任务 | harness unit | `tests/harness/projects.test.ts` | `pnpm vitest run tests/harness/projects.test.ts` |  |
| Windows 本机 `pnpm harness:prepush` 不再 `spawn EINVAL` | manual / harness | 命令实跑 | `pnpm harness:prepush` | 需要真实 Windows shell 和 pnpm.cmd 环境 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| prepush 平台分支 | 1, 2 |
| Project check 当前任务范围 | 3, 4 |
| 本机命令实跑 | 1 |
