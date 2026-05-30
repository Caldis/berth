# opsx-verify — 验证 (Verify 阶段)

目标: 完成完整测试 + code review + 前端视觉/交互验收。人在此确认验收。

前置: INDEX.phase == verify。

步骤:
1. 机械检查: `pnpm lint`, `pnpm typecheck`, `pnpm test` 全绿 (CI 亦会拦截)。
2. Code Review (只看机器判断不了的部分):
   - 对照 01-ANALYSIS.md 验收标准逐条核对产出。
   - 对照 02-SPEC.md 与 docs/ARCHITECTURE.md, 检查是否偏离设计、越界、违反 MVVM/进程隔离。
3. 前端验收: 启动应用, 截图, 走通受影响界面的交互流程, 完成视觉与交互验收 (Agent 需"看到界面、摸到设备")。
   - **启动前必查运行实例数, 能复用就复用** (vite HMR 已热更到新代码, 直接截图, 不重复启动):
     `pgrep -f 'Desktop/Code/berth.*electron-vite'`。出现 2 次以上重复启动立即停手查根因, 不靠加 pkill 打补丁。
   - 进程检测必须用**完整 .pnpm 路径模式** (electron 经 pnpm 软链, 简写会漏判 → 误以为没实例而重启):
     主进程 = `ps -Ao command | grep -F '.pnpm/electron@<ver>/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .' | grep -v -- '--type='` (排除 helper 子进程)。
   - 需冷启动 (验证主进程改动) 时先清零: `pkill -9 -f 'Desktop/Code/berth/node_modules/.pnpm/electron@'; pkill -9 -f 'Desktop/Code/berth.*electron-vite'`, 重启前后都确认实例数。
   - 截图前轮询确认 electron 主进程存活 (上面的完整模式), 而非仅看 vite 端口; 按窗口 id 截图。截图存 /tmp, 禁止入项目目录。
   - UI 改动 (布局/间距/样式) 的视觉验收必须用 `/frontend-design:frontend-design` 指导设计判断, 不靠拍脑袋调数值; 间距/对齐需有明确依据 (与既有元素对齐、符合平台 HIG)。
   - Electron `main` / `preload` / `BrowserWindow` / frameless titlebar / `-webkit-app-region` 改动必须冷启动真实应用实例验证, 不能依赖 renderer HMR 或只验证隔离测试实例。
   - 自绘窗口 chrome、标题栏按钮、拖拽区、系统窗口按钮等原生命中相关改动, 最小验收为: hover 有视觉反馈、真实 OS 鼠标点击生效、主进程窗口状态可观测变化 (如 maximize/restore 后读取 `BrowserWindow.isMaximized()` 或 Win32 `IsZoomed`)。
   - 这类命中验证禁止只用 Playwright/CDP 的 `locator.click()` 作为最终证据; CDP 点击可能绕过系统非客户区与 draggable region 命中。Windows 需要用 Win32 `SetCursorPos` + `mouse_event` 或同等级真实输入; macOS 需要用系统级鼠标事件工具。
   - Windows 进程检查需区分主进程和 helper 进程: 用 `Get-CimInstance Win32_Process` 查看 `electron.exe` 命令行, 主进程通常是 `electron.exe .` 或加载 `out/main/index.js`, helper 进程带 `--type=`。验证前后都要确认目标窗口对应的是刚冷启动的新进程。
4. 不通过项: 回写为 03-PLAN.md 新任务, 将 INDEX.phase 退回 implement, 重新进入开发循环。
5. 全部通过后, 提示用户确认验收, 然后 `opsx-archive`。

评审记录留在 PR/CI, 不进入项目持久层。
