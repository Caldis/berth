# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增 InspectorDrawer renderer 测试, 先复现 modal 语义和 focus trap 缺口。
  - tests: `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` (fail before implementation: no dialog role/name, no aria-modal, no focus trap)
  - verify: 测试覆盖 dialog role/aria-modal、Close 初始 focus、Copy/Close accessible name、Tab/Shift+Tab wrap、Escape/backdrop close、copy clipboard。
- [x] 任务 2: 在 InspectorDrawer 实现 modal 语义、初始 focus 和 focus trap。
  - tests: `pnpm vitest run tests/renderer/inspector-drawer.test.tsx` (pass, 4 tests); `pnpm typecheck:web` (pass)
  - verify: 保持右侧抽屉布局和现有视觉 token; Tab/Shift+Tab 不进入背景页面; Escape/backdrop/copy 行为不回退。
- [ ] 任务 3: 跑局部 harness、提交前门禁和真实 UI 验收。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-68-inspector-drawer-modal-focus`; `pnpm harness:prepush`
  - verify: agent-owned Electron 中用 CDP 断言 InspectorDrawer 初始 focus、Tab wrap、Shift+Tab wrap、Escape close, 并保存 PrintWindow 截图。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
