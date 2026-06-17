# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
- GitHub Issue: https://github.com/Caldis/berth/issues/139
- docs/issues/2026-06-11-BUG-e2e-window-controls-teardown-flaky-macos.md (已复发 4+ 次)
- CI 证据: run 27357315196 / 27361209136 / 27402075712 / 最新 27632710696 (macOS-latest, "Worker teardown timeout of 30000ms")。

## 复现步骤
1. 在 macOS (CI runner) 跑 `pnpm test:e2e`。
2. `tests/e2e/window-controls.e2e.ts` 用例全 skip (非 win32), 但 beforeEach 已 launchBerthApp 启动 Electron; afterEach `app.close()` 偶发不返回。
3. Playwright worker teardown 超 30s → `Worker teardown timeout of 30000ms exceeded` → 整个 `pnpm test:e2e` exit 1。

## 期望 vs 实际
- 期望: windows-only 用例在 macOS 干净跳过, 不启动也不关闭 app; 用例级 flaky 不放大为 run 级失败。
- 实际: beforeEach 无条件启 app → afterEach close 挂死 → run 级红, 连纯 docs 提交也被推红 (与提交内容无关的基础设施 flake)。

## 根因 (本机分析, explore 钉死)
- `window-controls.e2e.ts:13` `test.beforeEach` 无条件 `launchBerthApp`; 各用例 body 才 `test.skip(process.platform !== 'win32')` (line 26/50) + describe 级 skip (line 75)。
- 非 win32 上 beforeEach 先启 app, body 立即 skip, `afterEach` (line 21) `await app.close()` —— macOS 上 close 偶发挂起 (issue 记 always-on-top 窗口 close 时序), 拖垮 worker teardown。
- 为必跳用例启动 app 本身多余: 整文件 windows-only。
