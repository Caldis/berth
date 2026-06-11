# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。顺序执行 (T2/T3 依赖 T1 的 helper; T2 先验主案例再 T3 铺开), 无并行边界。
每个实现项必须有测试证据或明确例外理由。

- [x] T1 (commit 158517d): 新建 `tests/e2e/launch.ts` — `prepareIsolatedDirs(tempDir)` (建 user-data/codex-home/home 三隔离根) + `launchBerthApp(dirs, extraEnv?)` (统一 launch: NODE_ENV=test, CODEX_HOME, POSIX 下 HOME=homeDir; win32 不设 HOME 并注释言明已知差异; firstWindow + domcontentloaded)。
  - tests: `pnpm typecheck && pnpm lint` (tsconfig.test 纳管; 行为验收 = T2/T3 消费方 e2e 绿, 不另写测试的测试 — 例外理由见 02-SPEC 测试策略)
  - verify: 不适用 (非 UI); T2 e2e 绿即 helper 行为成立
- [x] T2 (commit 88acd48, e2e 4.5s 绿): `project-scope.e2e.ts` 接入 helper + 删 darwin skip (line 10-12) + 弹层打开后新增 `expect(page.getByRole('option')).toHaveCount(3)` 隔离生效断言; 原有断言与超时一律不动。
  - tests: macOS 本地 `pnpm build && pnpm test:e2e project-scope` 绿 (AC-1 / AC-3)
  - verify: 不适用 (非 UI)
- [x] T3 (commit 65f8c79, 全量 18 passed + 3 win-only skip, 28.8s): 其余 5 个 e2e (`global-shallow-scope` / `incremental-watch` / `snapshot-persistence` / `app` / `window-controls`) 接入 helper, 删除各自手写 launch/env; `app.e2e` 由此补齐 CODEX_HOME 隔离; 各测试自有 fixture 内容构造与断言不动。
  - tests: macOS 本地全量 `pnpm test:e2e` 绿 (win32-only skip 除外) (AC-2 / AC-4 本地部分)
  - verify: 不适用 (非 UI)
- [x] T4 (push 65f8c79, prepush 全绿 974 tests, CI#27329776394 success, Project ensure In Progress): 提交推送 + `pnpm harness:prepush` + CI (Windows e2e) 绿 (AC-4 远端部分); Project 字段同步 `ensure`。
  - tests: `pnpm harness:prepush`; `pnpm harness:ci:wait --sha <sha>`
  - verify: 不适用 (非 UI)

> archive 阶段硬项 (不在 implement 清单): `docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md` 补根因结论 + 关联 commit 后 `git mv` 至 `resolved/` (AC-5)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
