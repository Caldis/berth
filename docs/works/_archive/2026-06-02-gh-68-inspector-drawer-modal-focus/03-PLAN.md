# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增 InspectorDrawer renderer 测试, 先复现 modal 语义和 focus trap 缺口。
  - tests: `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` (fail before implementation: no dialog role/name, no aria-modal, no focus trap)
  - verify: 测试覆盖 dialog role/aria-modal、Close 初始 focus、Copy/Close accessible name、Tab/Shift+Tab wrap、Escape/backdrop close、copy clipboard。
- [x] 任务 2: 在 InspectorDrawer 实现 modal 语义、初始 focus 和 focus trap。
  - tests: `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` (pass, 4 tests); `pnpm typecheck:web` (pass)
  - verify: 保持右侧抽屉布局和现有视觉 token; Tab/Shift+Tab 不进入背景页面; Escape/backdrop/copy 行为不回退。
- [x] 任务 3: 跑局部 harness、提交前门禁和真实 UI 验收。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-68-inspector-drawer-modal-focus` (pass); `pnpm harness:prepush` (pass, 63 files / 475 tests, CI baseline success)
  - verify: implementation commit `5b7c760` pushed after local checks and CI baseline; `pnpm harness:ci:wait -- --sha 5b7c7602a1bc50d8248c8bbf44baf599bee17246` confirmed `CI#26818215571` success.
  - UI: agent-owned Electron `gh68-inspector-drawer-focus`, CDP asserted `aria-modal=true`, Close initial focus, Tab wraps to Copy, Shift+Tab wraps back to Close, Escape closes.
  - screenshots: `C:\Users\mail\AppData\Local\Temp\berth-gh68-inspector-drawer-focus-cdp.png`; `C:\Users\mail\AppData\Local\Temp\berth-gh68-inspector-drawer-focus-print-window.png`.
  - process guard: protected user dev node `452032` / Electron `259388` remained alive, no restart.
  - side issue: MCP `View Raw` button can be visible while raw content is unavailable; tracked in `docs/issues/2026-06-02-BUG-raw-button-no-feedback-without-content.md`.

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
