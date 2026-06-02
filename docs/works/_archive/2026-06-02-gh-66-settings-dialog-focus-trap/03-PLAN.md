# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增 SettingsDialog renderer 测试, 先复现 focus trap 缺口。
  - tests: `pnpm vitest run tests/renderer/settings-dialog.test.tsx` (fail before implementation: Shift+Tab did not leave Close, Escape close returned focus to body)
  - verify: 当前实现下 Tab/Shift+Tab focus trap 测试失败。
- [x] 任务 2: 在 SettingsDialog 实现 focus trap 和关闭后焦点恢复。
  - tests: `pnpm vitest run tests/renderer/settings-dialog.test.tsx` (pass, 2 tests)
  - verify: dialog 内 Tab/Shift+Tab 循环; Escape 与 Close 关闭; 焦点回到触发器; 不改视觉 class。
- [x] 任务 3: Sidebar 传入 Settings trigger ref。
  - tests: `pnpm vitest run tests/renderer/settings-dialog.test.tsx` (pass, 2 tests); `pnpm typecheck:web` (pass)
  - verify: 关闭后触发器恢复焦点, 类型检查通过。
- [x] 任务 4: 跑局部、提交前门禁和真实 UI 验收。
  - tests: `pnpm vitest run tests/renderer/settings-dialog.test.tsx` (pass, 2 tests); `pnpm typecheck:web` (pass); `pnpm harness:check --work docs/works/2026-06-02-gh-66-settings-dialog-focus-trap` (pass); `pnpm harness:prepush` (pass, 62 files / 466 tests); `pnpm harness:ci:wait -- --timeout 300 --poll 3` (pass, CI#26816593122 on 53308d5)
  - verify: agent-owned Electron `gh66-settings-dialog-focus` 中, CDP 断言初始焦点为 Close, Tab 从 Report Issue 回到 Close, Shift+Tab 从 Close 回到 Report Issue, Escape 关闭后焦点回到 Settings 触发按钮; 窗口截图保存到 `%TEMP%\berth-gh66-settings-dialog-focus-window.png`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
