# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增共享 ViewRawButton renderer 测试, 先复现 raw 不可用时静默失败。
  - tests: `pnpm vitest run tests/renderer/view-raw-button.test.tsx` (fail before implementation: missing shared component)
  - verify: 覆盖 raw 可用打开 InspectorDrawer、raw 不可用禁用并提示、IPC reject 禁用并提示。
- [x] 任务 2: 实现 ViewRawButton 并替换能力页/指令页同类入口。
  - tests: `pnpm vitest run tests/renderer/view-raw-button.test.tsx` (pass, 4 tests); `pnpm vitest run tests/renderer/view-raw-button.test.tsx tests/renderer/status-line-section.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/instructions-guidance.test.tsx` (pass, 4 files / 20 tests); `pnpm typecheck:web` (pass)
  - verify: View Raw 入口不再静默失败; 现有按钮风格和布局不退化。
- [x] 任务 3: 跑局部 harness、提交前门禁、真实 UI 验收、归档。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-69-view-raw-unavailable-state` (pass); `pnpm harness:prepush` (pass, 64 files / 479 tests, CI baseline success)
  - verify: implementation commit `1aedd62` pushed after local checks and CI baseline; `pnpm harness:ci:wait -- --sha 1aedd62cd8803b7d91952e69ae40ee25364c0fd5` confirmed `CI#26819792395` success.
  - UI: agent-owned Electron `gh69-view-raw-unavailable`, CDP verified MCP `openaiDeveloperDocs` raw unavailable action becomes disabled with title `这个资产没有可读取的原文内容。`; no drawer opens for unavailable raw; status line raw action still opens InspectorDrawer with `aria-modal=true`.
  - screenshots: `C:\Users\mail\AppData\Local\Temp\berth-gh69-view-raw-unavailable-cdp.png`; `C:\Users\mail\AppData\Local\Temp\berth-gh69-view-raw-drawer-cdp.png`; `C:\Users\mail\AppData\Local\Temp\berth-gh69-view-raw-drawer-print-window.png`.
  - process guard: protected user dev node `452032` / Electron `259388` remained alive, no restart.

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
