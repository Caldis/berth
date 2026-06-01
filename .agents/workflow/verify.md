# harness-verify — 验证 (Verify 阶段)

目标: 完成完整测试 + code review + 前端视觉/交互验收。人在此确认验收。

前置: INDEX.phase == verify。

步骤:
1. 机械检查: `pnpm lint`, `pnpm typecheck`, `pnpm test` 全绿 (CI 亦会拦截)。
2. Code Review (只看机器判断不了的部分):
   - 对照 01-ANALYSIS.md 验收标准逐条核对产出。
   - 对照 02-SPEC.md 与 docs/ARCHITECTURE.md, 检查是否偏离设计、越界、违反 MVVM/进程隔离。
3. 前端验收: 启动应用, 截图, 走通受影响界面的交互流程, 完成视觉与交互验收 (Agent 需"看到界面、摸到设备")。
   - **先观测用户 dev, 但不接管、不复用、不清理**。如果用户已经运行 `pnpm dev` / `npm run dev`, 记录其 electron-vite PID 与 Electron 主进程 PID, 作为验收前后保护对象。
   - Agent 需要真实应用实例时, 使用独立 lifecycle: `pnpm dev:agent start --id <stable-id>`。该命令会传 `--berth-agent-instance=<stable-id>` 与独立 `--user-data-dir`, 并把 owner pid/state/log 写入系统临时目录。
   - 验收结束只能执行 `pnpm dev:agent stop <stable-id>` 清理本轮 Agent 实例。禁止使用按仓库路径批量清零的 `pkill` / `taskkill` / `Stop-Process` 命令, 因为它们会误杀用户 dev。
   - 需冷启动验证 `main` / `preload` / `BrowserWindow` / titlebar 等改动时, 冷启动的是 agent-owned 实例, 不是用户 dev。用户 dev 的刷新由其自己的 `electron-vite dev --watch` / HMR 处理。
   - 截图前轮询确认目标 Electron 主进程存活, 且 command line 带本轮 `--berth-agent-instance=<stable-id>` 或 state 中记录的 pid; 不要只看 vite 端口。按窗口 id 截图。截图存 /tmp, 禁止入项目目录。
   - 进程检测必须区分主进程和 helper 子进程: Electron 主进程通常是 `electron .` 或加载 `out/main/index.js`, helper 子进程带 `--type=`。
   - UI 改动 (布局/间距/样式) 的视觉验收必须用 `/frontend-design:frontend-design` 指导设计判断, 不靠拍脑袋调数值; 间距/对齐需有明确依据 (与既有元素对齐、符合平台 HIG)。
   - Electron `main` / `preload` / `BrowserWindow` / frameless titlebar / `-webkit-app-region` 改动必须冷启动真实应用实例验证, 不能依赖 renderer HMR 或只验证隔离测试实例。
   - 自绘窗口 chrome、标题栏按钮、拖拽区、系统窗口按钮等原生命中相关改动, 最小验收为: hover 有视觉反馈、真实 OS 鼠标点击生效、主进程窗口状态可观测变化 (如 maximize/restore 后读取 `BrowserWindow.isMaximized()` 或 Win32 `IsZoomed`)。
   - 这类命中验证禁止只用 Playwright/CDP 的 `locator.click()` 作为最终证据; CDP 点击可能绕过系统非客户区与 draggable region 命中。Windows 需要用 Win32 `SetCursorPos` + `mouse_event` 或同等级真实输入; macOS 需要用系统级鼠标事件工具。
   - Windows 进程检查需区分主进程和 helper 进程: 用 `Get-CimInstance Win32_Process` 查看 `electron.exe` 命令行, 主进程通常是 `electron.exe .` 或加载 `out/main/index.js`, helper 进程带 `--type=`。验证前后都要确认目标窗口对应的是本轮 agent-owned pid / `--berth-agent-instance=<stable-id>`。
   - Windows UI 截图需用真实 `electron.exe` 主进程窗口, Playwright/CDP 只负责交互。不要用 `_electron.launch()` 返回进程的 `MainWindowHandle` 当截图句柄; 该 PID 可能没有主窗口句柄。高 DPI/显示缩放下, 优先用 Win32 枚举目标进程可见窗口, 再用 DWM `DWMWA_EXTENDED_FRAME_BOUNDS` 获取物理像素窗口边界后 `CopyFromScreen` 裁剪。
   - verify 过程中若遇到已验证的工具链 workaround、截图/进程/环境类问题、或用户纠正, 不等最终复盘: 先写入 `docs/friction/{YYYYMMDD}-verify-{summary}.md`, 必要时同步更新 workflow 规则, 跑 `pnpm harness:check` 通过后再继续最终汇报。
   - verify 过程中若发现已验证但不属于当前主线验收范围的产品 bug、功能缺口或改进项, 写入 `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`, 并在当前 verify 记录或 PLAN 中交叉引用; 不把旁支问题改成当前任务修复项, 除非用户明确扩大任务范围。
4. 不通过项: 回写为 03-PLAN.md 新任务, 将 INDEX.phase 退回 implement, 重新进入开发循环。
5. 全部通过后:
   - 若用户主动要求 Polish, 或 Agent 判断当前任务复杂且值得进一步检查, 只能先询问用户是否进入 `harness-polish`; 用户明确同意后再进入。
   - 若用户未要求或不同意 Polish, 提示用户确认验收, 然后 `harness-archive`。
   - 如果用户已明确认为任务完成或要求提交, 不要停在未提交工作区: 立即进入 archive 的归档与提交流程。若等待用户确认而暂不 archive, 最终说明必须明确“尚未提交, 下一步 archive/commit”。

评审记录留在 PR/CI, 不进入项目持久层。
