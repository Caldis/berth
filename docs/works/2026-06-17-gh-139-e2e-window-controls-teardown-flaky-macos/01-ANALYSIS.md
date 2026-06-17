# 需求分析 (Explore 产物)

## 现状理解
- `tests/e2e/window-controls.e2e.ts` 是 windows-only e2e (自绘 titlebar 命中)。所有用例 body 首行 `test.skip(process.platform !== 'win32', ...)` (line 26/50) 或在 describe 级 skip (line 75)。
- `test.beforeEach` (line 13) **无条件** `launchBerthApp(dirs)` 启动 Electron 并赋值模块级 `app`/`page`; `test.afterEach` (line 21) `await app.close()`。
- 链路: beforeEach → `launchBerthApp` (tests/e2e/launch.ts) → Electron 实例; afterEach → `app.close()`。

## 关联与依赖
- 非 win32 平台 (macOS/ubuntu CI): beforeEach 仍启动 app, body 立即 skip, afterEach close。为必跳用例启动 app 纯属多余开销。
- macOS runner 上 `app.close()` 偶发不返回 (issue 记: always-on-top / 窗口状态下 close 时序), Playwright `Worker teardown timeout of 30000ms exceeded` → `pnpm test:e2e` exit 1。用例级 flaky (Playwright 已自动重试通过) 被放大为 **run 级失败**, 连纯 docs 提交也被推红。
- ubuntu 无 display 不跑 Electron e2e, 不受影响; win32 真跑, close 不挂。

## 任务分类与 debt 校准
- type / maintenance.subtype: bug / —。
- source.kind / refs: docs-issues / docs/issues/2026-06-11-BUG-e2e-window-controls-teardown-flaky-macos.md; GitHub #139。
- debt estimate: incurred 1 / repaid 0 / net 1 / scope file / risk low / areas [testability] / confidence high。
- revision: 无 (0.0-new 即按已知根因校准)。

## 验收标准 (逐条编号)
1. 非 win32 平台**不启动 app**: `test.skip(process.platform !== 'win32', ...)` 移到 `beforeEach` 的 `launchBerthApp` 之前。
2. `afterEach` 守卫关闭: app 未启动 (非 win32) 时不调用 `close()`, 不抛错、不挂起。
3. win32 行为不变: 本地 `pnpm test:e2e -- tests/e2e/window-controls.e2e.ts` 通过 (3 用例正常跑/跳, app 正常启停)。
4. macOS CI `verify (macos-latest)` 的 window-controls 不再触发 worker teardown timeout; ubuntu/windows 不回归。
5. 不动产品代码, 仅改 `tests/e2e/window-controls.e2e.ts`。

## 界面质量与交互验收
不适用 (e2e 测试时序修复, 无 UI 改动)。

## 未决问题
无。根因与修复方案在来源 issue + 本机代码分析中已钉死。
