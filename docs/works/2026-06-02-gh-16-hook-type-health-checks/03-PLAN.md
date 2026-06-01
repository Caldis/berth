# 任务清单 (Design 产物 / 活清单)

- [ ] 任务 1: 补 health-check unit tests, 覆盖 Claude typed handler 缺字段、Codex async/commandWindows 提示。
  - tests: `pnpm test -- tests/unit/health-check.test.ts`
  - verify: 新测试先失败, 实现后通过。
- [ ] 任务 2: 扩展 health hook 收集字段并实现检查逻辑。
  - tests: `pnpm test -- tests/unit/health-check.test.ts`
  - verify: 新增检查带 `assetType: hook`, 官方 evidence 与 hooks tab target。
- [ ] 任务 3: 跑 node 类型检查和 harness 检查, 更新任务状态。
  - tests: `pnpm typecheck:node`; `pnpm harness:check`
  - verify: health 代码类型通过, 任务目录合规。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
