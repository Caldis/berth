# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1:
  - 内容: 更新 `tests/harness/prepush.test.ts`, 覆盖 Windows spawn command/args 和 macOS/Linux direct spawn。
  - tests: `pnpm vitest run tests/harness/prepush.test.ts` 通过, 4 tests passed。
  - verify: 非 UI 任务, 界面质量与交互验收不适用。
- [x] 任务 2:
  - 内容: 实现 `scripts/harness-prepush.mjs` 的平台化 spawn 参数, Windows 走 `cmd.exe`, macOS/Linux 保持 `pnpm`。
  - tests: `pnpm vitest run tests/harness/prepush.test.ts` 通过; Windows 本机 `pnpm harness:prepush` 不再 `spawn EINVAL`, 已实际进入并跑完 lint/typecheck/test/harness:check, 最终仅因已知远端 CI 基线 failure 失败。
  - verify: Windows 分支使用 `cmd.exe /d /s /c pnpm.cmd <script>`; macOS/Linux 测试断言保持 direct spawn `pnpm`。非 UI 任务, 界面质量与交互验收不适用。
- [x] 任务 3:
  - 内容: 更新 `tests/harness/projects.test.ts`, 覆盖 `auditTasks(..., { workDir })` 只检查指定任务且默认全仓行为不变。
  - tests: `pnpm vitest run tests/harness/projects.test.ts` 通过, 20 tests passed。
  - verify: 非 UI 任务, 界面质量与交互验收不适用。
- [x] 任务 4:
  - 内容: 实现 `scripts/harness-projects.mjs check --work <task-dir>`, 支持与 `--strict` 组合。
  - tests: `pnpm vitest run tests/harness/projects.test.ts` 通过; `pnpm exec node scripts/harness-projects.mjs check --strict --work docs/works/2026-06-03-gh-93-harness-verification-flow` 通过。
  - verify: `pnpm exec node scripts/harness-projects.mjs check --strict` 仍报告无关 GH-90 Project debt 字段漂移, 说明默认全仓 strict 语义未放宽; 非 UI 任务, 界面质量与交互验收不适用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

## verify 证据

- `pnpm vitest run tests/harness/prepush.test.ts` 通过, 4 tests passed。
- `pnpm vitest run tests/harness/projects.test.ts` 通过, 20 tests passed。
- `pnpm exec node scripts/harness-projects.mjs check --strict --work docs/works/2026-06-03-gh-93-harness-verification-flow` 通过。
- `pnpm harness:check --work docs/works/2026-06-03-gh-93-harness-verification-flow` 通过。
- `pnpm harness:prepush` 不再 `spawn EINVAL`; lint/typecheck/test/harness:check 均启动并通过, full test 为 85 files / 617 tests passed; 最终失败项仅为 `harness:ci:baseline`, 当前远端基线为 `ccd2eaf` 的既有 CI failure。
- `pnpm exec node scripts/harness-projects.mjs check --strict` 仍报告无关 GH-90 Project debt 字段漂移, 证明默认全仓 strict check 没有被降级。
