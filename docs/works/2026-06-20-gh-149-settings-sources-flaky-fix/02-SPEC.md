# 02-SPEC — Design 产物

## 方案 (A1 + B; C 独立 issue)
mock 全、promise 正常 resolve, 根源是"测试提前 teardown"而非 prod 缺 cleanup 的功能 bug → **主治测试层**。

### A1 (窄修 settings-sources, 必做)
`settings-sources.test.tsx`: 断言后 unmount + flush microtasks 让 pending 在 teardown 前 settle / 标记 unmounted。
`const { unmount } = render(...); ...断言不变...; await act(async () => { unmount(); await Promise.resolve() })`。

### B (setup 兜底, 覆盖同模式)
`tests/setup.ts` `afterEach`: `cleanup()` (@testing-library/react) + 一轮 microtask flush (`await Promise.resolve()`)。对所有 renderer 测试生效, 覆盖 settings-page/accent 同模式潜在 flaky。**不改 prod 行为**。
**禁用**: `process.on('unhandledRejection', ()=>{})` 吞掉 (掩盖真泄漏, 反模式)。

### C (hook 守卫根治) — 本任务不做, 立独立 issue
4 个 mount-time IPC 回调加 mounted/cancelled 守卫 (settings-content effect / use-update / use-ipc useScanEngineInfo + cached-resource)。真根治 prod 健壮性 (快速 mount/unmount 不 warn) 但 **blast radius 大** (use-ipc/use-update 被 Dashboard/Sessions/Capabilities 共用, 需全 renderer 回归)。立独立 issue。

## 文件边界
- `tests/renderer/settings-sources.test.tsx` (A1: unmount + act flush, 断言不变)
- `tests/setup.ts` (B: afterEach cleanup + microtask flush)
**不动 prod** (C 留后续 issue)。

## 测试策略 (flaky 是时序, 必须真跑加压验证, 非静态)
- **复现 + 修复有效性 (核心)**: 人为放大 — 临时把某 mock (platform.info / getPreferences) 改 `async () => { await new Promise(r=>setTimeout(r,0)); return … }` 推迟 settle 到 teardown 后 → **修复前稳定现 window-not-defined, 修复后 0**。验证后移除放大 (不入库)。
- **本地加压**: `pnpm vitest run tests/renderer/settings-sources.test.tsx --repeat=50/100`。
- **断言级**: settings-sources 原 4 断言保持绿 (A1 只在断言**后**加 unmount+flush)。
- **回归**: 全套 `pnpm test` 绿 (确认 B 的 afterEach cleanup 不破坏依赖 DOM 残留的测试; 各用例独立 render 风险低, 须全跑确认)。
- **稳定性**: 整套 `--repeat=20` 0 失败方算收敛。

## 风险
1. A1 unmount 须 `await act(async () => {...})` 包 (防 act warning 污染输出)。
2. B afterEach cleanup 兼容性 (各用例独立 render, 风险低, 全跑确认)。
3. B **禁**用吞 unhandledRejection 实现 (掩盖未来真泄漏)。
4. 残余边角 (effect 体 teardown 后才首次执行) unmount+flush 已关窗口; 若 CI 仍偶发再升 C。
