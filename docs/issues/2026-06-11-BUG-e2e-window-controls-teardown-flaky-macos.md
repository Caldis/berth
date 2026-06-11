# 描述
- macOS CI 上 `tests/e2e/window-controls.e2e.ts:49` (always-on-top pin 用例) flaky: 用例本身重试通过 (Playwright 标记 `1 flaky`), 但随后 afterEach `app.close()` 挂死, worker teardown 超 30s → `1 error was not a part of any test` → 整个 `pnpm test:e2e` exit 1, 纯文档提交也会被推红。

# 证据
- CI run 27357315196 (commit 78a5e6a3, 仅改 docs/works 两个 markdown): `verify (macos-latest)` 失败于 `Run pnpm test:e2e`; 日志显示 `Test timeout of 30000ms exceeded while running "afterEach" hook` 于 `window-controls.e2e.ts:21` (`await app.close()`), 终局 `18 passed / 1 flaky / 2 skipped` + worker teardown timeout。
- 同形态提交 e71c3733 (5 个 markdown) 同日 CI 绿 → 与提交内容无关, 是基础设施/时序 flake。
- Playwright 已对用例自动重试成功; 失败的是 teardown 阶段 Electron 进程关闭挂起 (always-on-top 窗口在 macOS runner 上 close 卡死的时序问题)。

# 预期 / 建议
- teardown 加防御: `app.close()` 包超时竞速 (Promise.race + 强杀 electron 进程), 或 afterEach 先把 alwaysOnTop 复位再 close; 也可评估对该用例在 macOS runner 上的 close 路径单独加宽 teardown 超时。
- 目标: 用例级 flaky 不应放大为 run 级失败。

# 来源 / 关联
- GH-120 (重放模块视觉重设计) explore→design 期间推送文档提交被该 flake 推红, rerun 后恢复。
- 状态: OPEN。
