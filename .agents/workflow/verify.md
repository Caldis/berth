# /opsx:verify — 验证 (Verify 阶段)

目标: 完成完整测试 + code review + 前端视觉/交互验收。人在此确认验收。

前置: INDEX.phase == verify。

步骤:
1. 机械检查: `pnpm lint`, `pnpm typecheck`, `pnpm test` 全绿 (CI 亦会拦截)。
2. Code Review (只看机器判断不了的部分):
   - 对照 01-ANALYSIS.md 验收标准逐条核对产出。
   - 对照 02-SPEC.md 与 docs/ARCHITECTURE.md, 检查是否偏离设计、越界、违反 MVVM/进程隔离。
3. 前端验收: 用 `run` skill / Playwright `_electron` 启动应用, 截图, 走通受影响界面的交互流程,
   完成视觉与交互验收 (Agent 需"看到界面、摸到设备")。
   - 启动前先清理同项目残留 dev 进程, 避免端口漂移与 electron 子进程冲突:
     `pkill -f 'Code/berth/node_modules/.bin/electron-vite'; pkill -f 'Code/berth/node_modules/electron/dist'`。
   - 截图前轮询确认 electron 主进程存活 (`pgrep -f 'Code/berth/node_modules/electron/dist/.../MacOS/Electron'`),
     而非仅看 vite 端口; 按窗口 id 截图。截图存 /tmp, 禁止入项目目录。
4. 不通过项: 回写为 03-PLAN.md 新任务, 将 INDEX.phase 退回 implement, 重新进入开发循环。
5. 全部通过后, 提示用户确认验收, 然后 `/opsx:archive`。

评审记录留在 PR/CI, 不进入项目持久层。
