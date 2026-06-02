# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 扩展 SearchDialog renderer 测试, 先复现 modal 语义和 focus trap 缺口。
  - tests: `pnpm vitest run tests/renderer/search-dialog.test.tsx` (fail before implementation: no dialog role/name, no input accessible name, no focus trap)
  - verify: 测试覆盖 dialog role/aria-modal、input 初始 focus、Tab/Shift+Tab wrap、Escape/backdrop/quick action close; 现有中文 quick action labels 继续覆盖。
- [x] 任务 2: 在 SearchDialog 实现 modal 语义、初始 focus 和 focus trap。
  - tests: `pnpm vitest run tests/renderer/search-dialog.test.tsx` (pass, 6 tests); `pnpm typecheck:web` (pass)
  - verify: 保持现有命令面板布局与视觉 token; Tab/Shift+Tab 不进入背景页面; Escape/backdrop/quick action 行为不回退。
- [x] 任务 3: 跑局部 harness、提交前门禁和真实 UI 验收。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-67-search-dialog-modal-focus` (pass); `pnpm harness:prepush` (pass, 62 files / 471 tests); `pnpm harness:ci:wait -- --timeout 300 --poll 3` (pass, CI#26817473052 on 5f6a292)
  - verify: agent-owned Electron `gh67-search-dialog-focus` 中, CDP 断言 dialog `aria-modal=true`, 初始焦点为搜索输入框, Shift+Tab 从输入框回到“用量”, Tab 从“用量”回到输入框, Escape 可关闭; Windows `PrintWindow` 截图保存到 `%TEMP%\berth-gh67-search-dialog-focus-print-window.png`, CDP 辅助截图保存到 `%TEMP%\berth-gh67-search-dialog-focus-cdp.png`; `guard after` 确认用户 dev PID 452032 / Electron PID 259388 未被重启。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
