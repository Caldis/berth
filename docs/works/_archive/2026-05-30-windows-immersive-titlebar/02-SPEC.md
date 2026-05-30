# 技术方案 (Design 产物)

## 数据契约

- 新增 preload API:
  - `window.api.window.minimize(): Promise<void>`
  - `window.api.window.toggleMaximize(): Promise<void>`
  - `window.api.window.close(): Promise<void>`
  - `window.api.window.isMaximized(): Promise<boolean>`
  - `window.api.window.onMaximizedChange(callback): () => void`
- 新增 IPC:
  - `window:minimize`
  - `window:toggle-maximize`
  - `window:close`
  - `window:is-maximized`
  - event: `window:maximized-change`

## 模块结构 / 组件拆分

- `src/main/index.ts`
  - Windows 下使用 `frame: false` + `titleBarStyle: 'hidden'`。
  - Windows 下 `mainWindow.setMenu(null)` 并启用 `autoHideMenuBar`, 明确移除默认菜单栏。
  - 监听 `maximize` / `unmaximize`, 向 renderer 发送 `window:maximized-change`。
- `src/main/ipc/handlers.ts`
  - 用 `BrowserWindow.fromWebContents(event.sender)` 找到当前窗口, 执行 minimize / maximize toggle / close / isMaximized。
- `src/preload/index.ts` 与 `src/preload/index.d.ts`
  - 只暴露最小窗口控制 API, 不复制 bobcorn 的 pin/always-on-top。
- `src/renderer/src/components/layout/window-controls.tsx`
  - 仅 Windows 渲染。
  - 使用 lucide 图标按钮, 固定在右上角拖拽区内, 每个按钮明确 `aria-label`。
- `src/renderer/src/components/layout/app-layout.tsx`
  - 通过 `isWindowsPlatform()` 条件挂载 `WindowControls`。
- `src/renderer/src/lib/platform.ts`
  - 增加 Windows 判断, 并补充 `navigator.platform` / `userAgent` fallback。

## 测试策略

- 单元测试扩展 `tests/renderer/platform.test.ts`, 覆盖 Windows 判断和 fallback。
- 新增 `tests/renderer/window-controls.test.tsx`, 覆盖按钮渲染、点击 IPC 调用、maximize 状态事件同步。
- 运行:
  - `pnpm test -- tests/renderer/platform.test.ts tests/renderer/window-controls.test.tsx`
  - `pnpm typecheck`
  - `pnpm harness:check`
  - 可行时运行 build 或 e2e 视觉验收, 若被既有脏改动或环境阻塞则说明。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Windows `frame:false` + `setMenu(null)` | 1, 2, 4 |
| 自绘窗口控制按钮 + IPC | 2, 4 |
| macOS 条件逻辑保持原样 | 3 |
| renderer 单元测试和类型检查 | 5 |
