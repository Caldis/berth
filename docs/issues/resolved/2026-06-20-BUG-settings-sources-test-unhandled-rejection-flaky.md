# BUG: settings-sources.test.tsx unhandled rejection flaky (window not defined after teardown)

## 现象
CI ubuntu `pnpm test` 偶发 exit 1: **1297 测试全 passed 但 8 个 `Unhandled Rejection: ReferenceError: window is not defined`**, 源自 `tests/renderer/settings-sources.test.tsx`, vitest 注明 "caught after test environment was torn down"。macos/windows 同 commit `pnpm test` 绿; 仅 ubuntu 偶发 (时序相关)。vitest 把 unhandled rejection 算 error → exit 1 (即使断言全过)。

## 根因 (待修)
`settings-sources.test.tsx` (或其渲染的组件/hook) 有**未取消的异步任务** (setTimeout / interval / pending promise / useEffect 未 cleanup), 测试结束 jsdom 环境拆除后才 reject 或访问 `window` → `window` 已 undefined → unhandled rejection。ubuntu 较慢/时序不同, 异步任务在 teardown 后才落地; macos/windows 时序使其在拆除前完成, 故不暴露。

## 归因 (与 GH-148 无关, 既有 flaky)
- 首次在 GH-148 archive 的**纯 docs commit** `46afad71` CI (ubuntu verify) 暴露。改动域 (docs / scan-engine session 解析) 与失败域 (renderer settings 测试异步泄漏) **完全不相交**。
- 同代码 `7bca0288` (GH-148 implement) ubuntu `pnpm test` 绿; `46afad71` macos/windows 也绿 → 时序 flaky, 非 GH-148 引入。

## 建议修复
- 定位 `settings-sources.test.tsx` 渲染的组件中发起异步的点 (IPC mock 回调 / useEffect 订阅 / 定时器); `afterEach` 或 unmount 前 `clearTimeout`/`clearInterval`/`abort`; 或给 pending promise 加 cleanup。
- 可能需要 mock 掉未 cleanup 的 effect 依赖; 或 vitest config 加 `dangerouslyIgnoreUnhandledErrors` 仅作临时缓解 (不推荐, 治标)。
- 复现: ubuntu CI 多跑偶发; 本地可加压 (`--repeat` / CPU 限速) 提高命中率。

## 来源
GH-148 archive docs commit `46afad71` CI (ubuntu verify) flaky 归因 (2026-06-20)。

## 修复 (GH-149, A1 止血)
`settings-sources.test.tsx` 加 unmount + `await act` flush microtasks (commit `f1ebc30f`), drain SettingsContent 挂载的 4 条 window.api promise chain 在 jsdom teardown 前。确定性修复 (unmount 忽略 teardown 后 setState + flush drain pending), 非降概率。根因系统性 (SettingsContent IPC 无 mounted 守卫 + setup 无 afterEach cleanup + 同模式 settings-page/accent 潜在 flaky), 根治 (C) 与测试 cleanup 标准化 (B, 受 fake-timer 约束) 见 `docs/issues/2026-06-20-IMPROVEMENT-settingscontent-mount-ipc-mounted-guard-and-test-cleanup.md`。

## 收口 (2026-06-20, RESOLVED)
A1 止血为确定性修复 (unmount 忽略 teardown 后 setState + flush drain pending), flaky 本体已消除。系统性根治 (C mounted 守卫 + B setup.ts cleanup 标准化) 作为独立 IMPROVEMENT 跟踪于 #14。本 BUG 关闭。
