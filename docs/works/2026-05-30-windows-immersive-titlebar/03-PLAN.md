# 任务清单 (Design 产物 / 活清单)

- [x] 任务 1: 调整主进程 Windows 窗口参数并移除默认菜单。
- [x] 任务 2: 增加窗口控制 IPC 契约、主进程 handler、preload API。
- [x] 任务 3: 增加 Windows 自绘窗口控制组件并挂载到 AppLayout。
- [x] 任务 4: 补测试, 覆盖平台判断与窗口控制按钮行为。
- [x] 任务 5: 运行针对性测试、typecheck、harness:check, 必要时做视觉验收。

## 验证记录

- `pnpm test -- tests/renderer/platform.test.ts tests/renderer/window-controls.test.tsx`: 8 passed。
- `pnpm typecheck`: passed。
- `pnpm harness:check`: passed。
- `pnpm lint`: passed。
- `pnpm build`: passed。
- `pnpm test`: 68 passed。
- Playwright Electron 临时 profile 实测: `BrowserWindow.isMenuBarVisible() === false`, `[data-testid="window-controls"]` visible, 截图输出 `test-results/windows-titlebar.png`。
- 用户反馈按钮不可点后补充验证:
  - `src/renderer/src/components/layout/window-controls.tsx` 提升到 `z-[10000]`, 容器和按钮都显式 `titlebar-no-drag` / `pointer-events-auto`。
  - `src/renderer/src/components/layout/app-layout.tsx` 在 Windows 下让顶部拖拽条右侧避开窗口按钮, 并把 `WindowControls` 放到 `main` 后渲染。
  - 新增 `tests/e2e/window-controls.e2e.ts`, 使用真实 Windows 鼠标点击最大化和还原按钮, 并从主进程断言窗口状态变化。
  - `pnpm build`: passed。
  - `pnpm exec playwright test tests/e2e/window-controls.e2e.ts`: 1 passed。
  - `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0`: 1 passed。
  - `pnpm lint`: passed。
  - `pnpm typecheck`: passed。
  - `pnpm test`: 76 passed。
  - `pnpm harness:check`: passed。
  - 普通 `electron .` 冷启动后, 对真实 Berth 窗口用 Win32 鼠标点击右上角最大化/还原坐标, `IsZoomed` 结果 `false -> true -> false`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
