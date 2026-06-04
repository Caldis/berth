# 实施计划 (Implement 产物)

- [x] 任务 1: 新增 Radix Popover 依赖和共享 `FloatingPopover`。
  - tests: `pnpm typecheck:web` — passed
  - verify: 组件使用 Portal, 支持 hover/focus/click, 统一 z-index/collision padding, 不包含业务文案。

- [x] 任务 2: Header 指南浮层接入 `FloatingPopover`。
  - tests: `pnpm exec vitest run tests/renderer/capabilities-guidance.test.tsx` — 8 passed; `pnpm exec vitest run tests/renderer/instructions-guidance.test.tsx` — 5 passed
  - verify: hover/click 后 `page-guide-panel` 可见, 不在 `top-navigation` DOM 内, 指南 Details 仍可展开。

- [x] 任务 3: Hooks Hook 检查状态 tag 接入 `FloatingPopover`。
  - tests: `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` — 31 passed
  - verify: clean / warning / stale 状态文案不变; hover/focus 后浮层不在 lifecycle sidebar DOM 内。

- [x] 任务 4: 收口验证。
  - tests: `pnpm typecheck:web` — passed; `pnpm exec vitest run tests/renderer/capabilities-guidance.test.tsx` — 8 passed; `pnpm exec vitest run tests/renderer/instructions-guidance.test.tsx` — 5 passed; `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` — 31 passed; `pnpm harness:check --work docs/works/2026-06-04-gh-102-fix-clipped-app-popovers` — passed; `pnpm harness:prepush` — passed.
  - verify: Electron agent 实例 `gh102-popovers-verify` 实测通过; CDP 断言 header 指南 panel 不在 `top-navigation` 或 `aside` DOM 内, Hook 检查 tooltip 不在 `hook-health-panel` 或 `aside` DOM 内, 两者 `z-index=50`; Hook 检查 tooltip 右边界 596.9px > panel 右边界 568px。真实窗口截图: `C:\Users\mail\AppData\Local\Temp\berth-gh102-header-guide-popover.png`; `C:\Users\mail\AppData\Local\Temp\berth-gh102-hook-health-popover.png`; `pnpm dev:agent guard after --id gh102-popovers-verify --json` 返回 `guard-ok`。
