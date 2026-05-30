# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 新增 `resolveDefaultProjectDir` helper 与单元测试, verify: `pnpm test -- tests/unit/project-dir.test.ts` 通过。
- [x] 任务 2: 在 `src/main/index.ts` 中使用 helper, verify: 测试通过且 scanner/watcher 共享 `projectDir`, 不再直接传 `process.cwd()`。
- [x] 任务 3: 运行 harness 校验, verify: `pnpm harness:check` 通过。

## implement 验证记录

- `pnpm test -- tests/unit/project-dir.test.ts`: 通过, 2 tests。
- `pnpm harness:check`: 通过。
- `pnpm lint`: 通过。
- `pnpm typecheck`: 通过。
- `pnpm test`: 通过, 9 files / 60 tests。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

## verify 核对

- ANALYSIS 1: dev 模式 `resolveDefaultProjectDir` 返回 `undefined`, scanner / watcher 接收同一个 `projectDir`。
- ANALYSIS 2: non-dev 模式保持返回传入 cwd。
- ANALYSIS 3: `tests/unit/project-dir.test.ts` 覆盖 dev / non-dev 分支。
- ANALYSIS 4: 本轮只新增任务态、`src/main/project-dir.ts`、`tests/unit/project-dir.test.ts`, 并修改干净的 `src/main/index.ts`。
- 前端视觉/交互验收: 不适用, 本修复不改变 renderer UI。
