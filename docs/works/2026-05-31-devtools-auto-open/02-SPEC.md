# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- 新增纯函数 `shouldAutoOpenDevTools(options)`:
  - `isDev`: 是否处于 Electron 开发模式。
  - `rendererUrl`: electron-vite 注入的 renderer dev server URL。
  - `isAgentDev`: 是否为 agent-owned dev 实例。
- 返回值为布尔值, 只决定是否给窗口注册自动打开 DevTools 的加载完成回调。

## 模块结构 / 组件拆分

- `src/main/devtools.ts`: 放置 `shouldAutoOpenDevTools(...)`, 让 dev/agent/生产判定可单元测试。
- `src/main/index.ts`: `createWindow(...)` 接收 `openDevTools` 选项; 选项为真时, 在加载页面前注册一次 `did-finish-load` 回调, 调用 `mainWindow.webContents.openDevTools({ mode: 'undocked' })`。
- `app.whenReady()` 与 macOS `activate` 重建窗口路径使用同一判定, 避免行为不一致。

## 测试策略

- 先写 `tests/unit/devtools.test.ts`, 覆盖普通 electron-vite dev、生产/构建入口、agent-owned dev 三种情况。
- 实现后运行目标测试、`pnpm typecheck:node`、`pnpm harness:check`。
- 因本次改动位于 `BrowserWindow` 创建路径, verify 阶段用 agent-owned 实例冷启动确认应用仍可打开; DevTools 自动打开本身由单元测试覆盖其判定边界。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `shouldAutoOpenDevTools(...)` 普通 dev 为真 | 1 |
| `shouldAutoOpenDevTools(...)` 生产/构建入口为假 | 2 |
| `shouldAutoOpenDevTools(...)` agent-owned dev 为假 | 3 |
| 保留 `optimizer.watchWindowShortcuts(window)` | 4 |
| 单元测试、typecheck、harness 检查 | 5 |
