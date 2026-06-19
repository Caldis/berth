# BUG 快照 (只读输入)

## 来源
- `docs/issues/2026-06-20-BUG-settings-sources-test-unhandled-rejection-flaky.md`
- GH-148 archive docs commit `46afad71` CI (ubuntu) 暴露; 同代码 `23f6820c` 没撞 (二次确认 flaky)。

## 现象
CI ubuntu `pnpm test` 偶发 exit 1: **1297 断言全过, 但 8 个 `Unhandled Rejection: ReferenceError: window is not defined`**, 源自 `tests/renderer/settings-sources.test.tsx`, vitest 注明 "caught after test environment was torn down"。macos/windows 绿, 仅 ubuntu 偶发 (时序)。vitest (无 `dangerouslyIgnoreUnhandledErrors`) 把 teardown 后 unhandled rejection 判 run 失败。

## 复现
本地 mac 复现率低 (时序竞速); 加压: `vitest --repeat=50` 单跑 settings-sources, 或**人为推迟 mock settle** (mock 加 setTimeout) 放大 teardown 竞速稳定复现。

由 harness 续做 (用户继续指令)。
