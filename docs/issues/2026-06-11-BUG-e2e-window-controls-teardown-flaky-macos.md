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
- 第 2 次复发 (2026-06-12, run 27361209136, commit 761783f2 renderer 改动): 同形态 — 用例 flaky 重试已过 + `Worker teardown timeout of 30000ms` + `22 passed / 1 flaky` → run 级失败。两日内两中, 频率已影响推送节奏, 建议提升处理优先级。
- 第 3 次复发 (2026-06-12, run 27402075712, commit 0e3fd35b **纯 docs 归档移动**): 同形态 (window-controls teardown + "2 errors were not a part of any test"), win/ubuntu 双绿。GH-123 归档推送被推红, rerun 处理。两日三中 — 建议下一个维护窗口直接做 teardown 防御 (app.close 超时竞速 + alwaysOnTop 复位)。
- 状态: OPEN。
