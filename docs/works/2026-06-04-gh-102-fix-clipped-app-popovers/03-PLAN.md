# 实施计划 (Implement 产物)

- [x] 任务 1: 新增 Radix Popover 依赖和共享 `FloatingPopover`。
  - tests: `pnpm typecheck:web` — passed
  - verify: 组件使用 Portal, 支持 hover/focus/click, 统一 z-index/collision padding, 不包含业务文案。

- [x] 任务 2: Header 指南浮层接入 `FloatingPopover`。
  - tests: `pnpm exec vitest run tests/renderer/capabilities-guidance.test.tsx` — 8 passed
  - verify: hover/click 后 `page-guide-panel` 可见, 不在 `top-navigation` DOM 内, 指南 Details 仍可展开。

- [x] 任务 3: Hooks Hook 检查状态 tag 接入 `FloatingPopover`。
  - tests: `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` — 31 passed
  - verify: clean / warning / stale 状态文案不变; hover/focus 后浮层不在 lifecycle sidebar DOM 内。

- [ ] 任务 4: 收口验证。
  - tests: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-102-fix-clipped-app-popovers`; 视情况跑 `pnpm harness:check`
  - verify: Electron dev 实测 header 指南与 Hook 检查浮层不被侧栏裁剪, 记录截图路径。
