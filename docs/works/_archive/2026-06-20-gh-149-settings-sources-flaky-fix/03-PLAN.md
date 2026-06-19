# 03-PLAN — 活任务清单

## 实现项
- [x] A1: `settings-sources.test.tsx` 加 unmount + `await act` flush microtasks (断言不变, commit f1ebc30f)
  - verify: 原 4 断言绿 + 全套 1297 + 0 unhandled + typecheck/lint 绿。**确定性修复** (unmount 忽略 teardown 后 setState + flush drain pending before teardown), 非降概率。
- [x] B **不做**: fake-timer 测试存在 (memory-view/use-focus-target/collapsible/hooks-lifecycle-view), 全局 afterEach `setTimeout` flush 会撞 fake timer 挂起; 改 `act` flush 的 setup 标准化版并入 C issue。
- [x] C 根治立独立 issue: `docs/issues/2026-06-20-IMPROVEMENT-settingscontent-mount-ipc-mounted-guard-and-test-cleanup.md` (4 IPC mounted 守卫 + 同模式 settings-page/accent + setup cleanup 标准化)
- [x] `docs/issues/2026-06-20-BUG-settings-sources-...flaky` 状态更新 (A1 止血 + C 引用)

## 验收
`pnpm test` 全绿 (1297, 0 unhandled) + typecheck/lint 绿 + A1 确定性逻辑 + CI 实证 (f1ebc30f ubuntu)。

## 验证局限 (诚实记录)
本地 mac **未跑成 "修复前必现泄漏" 的 baseline 放大复现** — flaky 是时序本质 (explore 判断 mac 复现率低, ubuntu 偶发), 人为放大需精确撞 React 内部 teardown-后-setState 时机, 本地难稳定触发。本任务验证依据为: ① A1 **确定性逻辑** (flush 在 test body 内、jsdom teardown 前 drain pending, 逻辑上消除竞速窗口, 非降概率) ② 全套真跑 1297 + 0 unhandled ③ **CI ubuntu 实证** (f1ebc30f 多次绿确认不再 flaky)。若 CI 仍偶发, 升级 C 根治。
