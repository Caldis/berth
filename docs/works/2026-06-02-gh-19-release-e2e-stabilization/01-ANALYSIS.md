# 需求分析 (Explore 产物)

## 现状理解
相关文件:

- `tests/e2e/window-controls.e2e.ts`: 使用 Playwright Electron 启动构建后的 `out/main/index.js`, 再用 Win32 `SetCursorPos` + `mouse_event` 真实点击最大化/还原按钮。
- `src/renderer/src/components/layout/window-controls.tsx`: 渲染最小化、最大化/还原、关闭按钮。
- `src/main/ipc/handlers.ts`: `window:toggle-maximize` 调用 `BrowserWindow.maximize()` / `unmaximize()`。
- `src/main/index.ts`: 监听 maximize/unmaximize 并通知 renderer。

复现结果:

- `pnpm test:e2e`: 13 passed, 1 failed, 失败项为 `Windows custom titlebar buttons are clickable`。
- `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0`: 1 failed。
- 单独运行也失败, 排除默认 2 worker 并发启动造成的单实例锁干扰。

## 关联与依赖
失败发生在真实鼠标点击后, renderer DOM 按钮可见且 preload API 存在, 但主进程窗口没有最大化。高概率原因在 E2E 的 Win32 鼠标坐标或窗口句柄:

- Playwright locator 的 `boundingBox()` 是 CSS pixel / 页面坐标。
- Electron `BrowserWindow.getBounds()` 与 Windows `SetCursorPos` 的坐标单位可能受 DPI 缩放影响。
- 现有脚本用 `app.process()?.pid` 对应进程的 `MainWindowHandle`, 不一定比 `BrowserWindow.getNativeWindowHandle()` 更可靠。

本任务不改产品 UI; 优先修测试的真实鼠标定位, 保持“真实 OS 鼠标点击 + 主进程状态变化”的验收。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. `tests/e2e/window-controls.e2e.ts` 能在 Windows 本机单独通过。
2. `pnpm test:e2e` 能在 Windows 本机通过。
3. E2E 仍使用真实 OS 鼠标点击, 不退回只用 Playwright/CDP 点击。
4. 本地门禁通过: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, `pnpm build`。
5. 推送后新 SHA 对应 GitHub Actions run 通过。

## 界面质量与交互验收
不改 UI。交互验收通过 E2E 真实鼠标点击覆盖。

## 未决问题
留给 design 向人澄清。
无。
