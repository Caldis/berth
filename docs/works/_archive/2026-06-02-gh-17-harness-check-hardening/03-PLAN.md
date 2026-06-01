# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 验证空 playbook 检测与合规 workflow 检查。
  - tests: `pnpm test -- tests/harness/check.test.ts`
  - verify: 不适用 UI; `pnpm test -- tests/harness/check.test.ts` 通过, 33 tests passed; `node -e "import('./scripts/harness-check.mjs').then(...checkWorkflowSources...)"` 输出 `workflow sources ok`。
- [x] 任务 2: 验证两个 `_archive/.gitkeep` 均被 git 跟踪。
  - tests: not needed - 静态 git index 状态检查。
  - verify: `git ls-files docs/works/_archive/.gitkeep docs/friction/_archive/.gitkeep` 输出两个路径。
- [x] 任务 3: 将 GH-17 本地 issue 移入 resolved, 同步 GitHub issue 状态。
  - tests: `pnpm harness:issues`; `pnpm harness:check`
  - verify: 不适用 UI; 本地 issue 已移入 `docs/issues/resolved/`; GitHub issue 已关闭; `pnpm harness:issues` 显示 active=10 resolved=7; `pnpm harness:check` 通过; `node scripts/harness-projects.mjs check --strict` 通过。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
