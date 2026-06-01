# 需求分析 (Explore 产物)

## 现状理解

- `package.json` 的 `dev` 脚本为 `electron-vite dev --watch`。
- `src/main/index.ts` 在开发模式且存在 `ELECTRON_RENDERER_URL` 时通过 `mainWindow.loadURL(...)` 加载 renderer dev server。
- 当前主进程只在 `browser-window-created` 中调用 `optimizer.watchWindowShortcuts(window)`。本地依赖 `@electron-toolkit/utils` 的实现显示: 开发模式下按 `F12` 时才调用 `webContents.openDevTools({ mode: "undocked" })`。
- Electron 官方文档说明 `webContents` 有 `did-finish-load` 事件, 也有 `openDevTools([options])` 方法; 因此可以在页面加载完成后打开 DevTools。
- `pnpm dev:agent start` 会通过 `--berth-agent-instance=<id>` 启动 agent-owned dev 实例, 主要用于自动化验收。该路径不应默认弹出 DevTools, 否则会干扰后续截图和交互验收。

## 关联与依赖

- 改动只涉及 Electron 主进程窗口创建逻辑, 不涉及 renderer、preload、IPC 契约或资产扫描。
- 普通用户 dev 与 agent-owned dev 通过 `configureAgentDevProfile(...)` 的返回值区分。
- 生产包不应打开 DevTools; e2e 中直接启动 `out/main/index.js` 且没有 `ELECTRON_RENDERER_URL`, 也不应打开。

## 验收标准

1. 普通 `npm run dev` / `pnpm dev` 下, 主窗口加载完成后自动打开 DevTools。
2. 生产/构建入口不自动打开 DevTools。
3. `pnpm dev:agent start` 这类 agent-owned dev 实例不自动打开 DevTools。
4. 现有 `F12` 切换 DevTools 的行为保留。
5. 变更有单元测试覆盖判定逻辑, 并通过 node typecheck 与 harness 检查。

## 未决问题

无。
