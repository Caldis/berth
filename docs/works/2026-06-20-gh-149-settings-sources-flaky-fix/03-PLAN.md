# 03-PLAN — 活任务清单

## 实现项 (每项先写/验证, 跑通才勾)
- [ ] A1: `settings-sources.test.tsx` 加 unmount + `await act` flush microtasks (断言不变)
  - verify: 原 4 断言绿 + **人为放大** (mock 推迟 settle) 下修复前现泄漏 / 修复后 0
- [ ] B: `tests/setup.ts` afterEach `cleanup()` + microtask flush
  - verify: 全套 `pnpm test` 绿 (afterEach cleanup 不破坏其他测试)
- [ ] **flaky 真跑验证**: `vitest --repeat=50/100` 单跑 settings-sources + 整套 `--repeat=20` 0 失败 (时序加压, runtime 非静态)
- [ ] C 根治立独立 issue (use-ipc/use-update/settings-content hook 守卫, blast radius 大): `docs/issues/`
- [ ] `docs/issues/2026-06-20-BUG-settings-sources-...flaky` 状态更新 (A1+B done, C 独立 issue 引用)

## 验收
`pnpm test` 全绿 + settings-sources `--repeat` 加压 0 失败 + **人为放大复现确认修复有效** (flaky 时序真跑验证, 非静态绿)。
