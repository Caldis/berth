# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1:
  - 内容: 在 `tests/renderer/hooks-lifecycle-view.test.tsx` 写失败测试, 覆盖左侧 rail 重排、Hook 检查纵向布局、右侧滚动同步、SVG connector。
  - tests: 新增断言在旧实现下失败; 实现后 `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 30 tests passed。
  - verify: 已覆盖布局层级、交互反馈、可访问性与视觉关联验收项。
- [x] 任务 2:
  - 内容: 实现左侧 rail 重排、HookHealthSignal 纵向布局、HookRecoveryCenter 移入左栏, 保持现有 hover/focus 与恢复行为。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 30 tests passed。
  - verify: Hook 检查与恢复中心位于生命周期下方; Hook 检查状态不靠 flex-wrap tag 展示; 现有恢复与健康 hover 测试通过。
- [x] 任务 3:
  - 内容: 实现 IntersectionObserver scroll spy、SVG 圆角连线、尺寸/滚动重算 helper, desktop 显示 connector, mobile 隐藏。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 30 tests passed; `pnpm typecheck:web` 通过。
  - verify: 滚动同步 `aria-current`; connector `aria-hidden` / `pointer-events-none` / `strokeLinecap=round` / `strokeLinejoin=round`; 点击生命周期仍滚动。
- [ ] 任务 4:
  - 内容: 完整门禁与 Electron 视觉/交互验收, 记录证据。
  - tests: `pnpm harness:check --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout`; `pnpm typecheck:web`; `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 真实 Hooks 页面截图; 右侧滚动时左侧高亮变化; 左右连线不遮挡内容; 窄视口不出现横向滚动。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
