# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 本地 schema 与模板
  - files: `scripts/harness-lib.mjs`, `scripts/harness-check.mjs`, `docs/works/_template/INDEX.md`, `tests/harness/check.test.ts`
  - tests: `pnpm vitest run tests/harness/check.test.ts`; `pnpm harness:check --work docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow`
  - verify: 2026-06-02 `pnpm vitest run tests/harness/check.test.ts` 41 tests passed; `pnpm harness:check --work docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow` passed; `pnpm harness:check` passed. `maintenance` 合法、非法 subtype/source/debt 被拒绝; 旧任务缺 debt 不报错; 非 UI, 界面质量与交互验收不适用。
- [x] 任务 2: debt pool 统计
  - files: `scripts/harness-stats.mjs`, `tests/harness/stats.test.ts`, `package.json` 如需新增脚本
  - tests: `pnpm vitest run tests/harness/stats.test.ts`
  - verify: 2026-06-02 `pnpm vitest run tests/harness/stats.test.ts` 6 tests passed; `pnpm harness:stats` 输出 debt total/status/unscored/areas, 旧 works/friction/issues/dist 行保留; 非 UI, 界面质量与交互验收不适用。
- [x] 任务 3: GitHub Project 字段创建与同步
  - files: `scripts/harness-projects.mjs`, `tests/harness/projects.test.ts`, `package.json` 如需新增脚本
  - tests: `pnpm vitest run tests/harness/projects.test.ts`
  - verify: 2026-06-02 `pnpm vitest run tests/harness/projects.test.ts` 19 tests passed; `node scripts/harness-projects.mjs fields ensure` 创建并确认 14 个 Project 自定义字段; `node scripts/harness-projects.mjs ensure docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow` 同步当前任务 Task Type/Priority/date/debt/scope/risk/source; `node scripts/harness-projects.mjs check --strict` passed; 当前用户仓库不伪装 GitHub Issue Type; 非 UI, 界面质量与交互验收不适用。
- [x] 任务 4: workflow 与工具文档
  - files: `.agents/workflow/_shared.md`, `.agents/workflow/0.0-new.md`, `.agents/workflow/1.0-explore.md`, `.agents/workflow/2.0-design.md`, `.agents/workflow/3.0-implement.md`, `.agents/workflow/3.1-polish.md`, `.agents/workflow/4.0-verify.md`, `.agents/workflow/5.0-archive.md`, `.agents/README.md`, `.agents/tools.md`, `docs/works/_template/01-ANALYSIS.md`, `docs/works/_template/02-SPEC.md`, `docs/works/_template/03-PLAN.md`
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow`; `pnpm harness:check`
  - verify: 2026-06-02 `pnpm harness:check --work docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow` passed; `pnpm harness:check` passed; `pnpm harness:stats` 输出 debt total=16 status=ok; `node scripts/harness-projects.mjs check --strict` passed; debt 逐步校准、阈值覆盖、Project 字段同步规则在入口和 workflow 中可见; 非 UI, 界面质量与交互验收不适用。
- [ ] 任务 5: 当前任务 debt final 与总验证
  - files: `docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow/INDEX.md`, `03-PLAN.md`
  - tests: `pnpm vitest run tests/harness/check.test.ts tests/harness/stats.test.ts tests/harness/projects.test.ts`; `pnpm typecheck`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 所有计划项有测试证据; 当前任务字段同步通过; phase 更新为 verify; 非 UI, 界面质量与交互验收不适用。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
