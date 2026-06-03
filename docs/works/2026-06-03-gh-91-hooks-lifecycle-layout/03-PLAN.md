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
- [x] 任务 4:
  - 内容: 完整门禁与 Electron 视觉/交互验收, 记录证据。
  - tests: `pnpm harness:check --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过; `pnpm typecheck:web` 通过; `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 30 tests passed。
  - verify: Electron agent 实例 `hooks-layout` 已实测; 截图 `/tmp/berth-hooks-layout-desktop.png`; 右侧滚到 `Before a tool runs` 后左侧 `03` 高亮; desktop connector 9 条, `stroke-linecap=round`, `stroke-linejoin=round`; 760px 视口无横向溢出且 connector 隐藏。
- [x] 任务 5:
  - 内容: 修正左侧生命周期 rail 的 sticky 顶部偏移和最大高度, 为绝对定位 header 预留空间; 来源为重复问题 #92。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/app-layout.test.tsx` 通过, 32 tests passed; `pnpm typecheck:web` 通过; `pnpm harness:check --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过。目标测试仍打印既有 React `act(...)` warning, 结果通过。
  - verify: Electron agent 实例 `gh91-gutter-align` 实测通过; header bottom=72, content offset=96px, scrollbar gutter=10px; 左栏左侧=24px, 左栏到 header=24px, 右栏到 header=24px, 右栏到可见 scrollbar=24px; lifecycle rail sticky top=96px, max-height=740px; 截图 `C:\Users\mail\AppData\Local\Temp\berth-agent-dev\gh91-gutter-align\screenshot.png`; guard after 返回 `guard-ok`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- 2026-06-03: 用户反馈 hooks 页面左侧“生命周期”sticky/fixed 高度没有正确为 header 预留空间。该问题属于 GH-91 布局验收缺口, 已退回 implement 并追加任务 5。
- 2026-06-03: 用户进一步要求左栏左侧、左栏到 header、右栏到 header、右栏到 scrollbar 四个距离完全一致。已将 shell 内容 gutter 统一为 24px, 并按实际 scrollbar gutter 调整右侧 padding; 任务 5 通过目标测试、web typecheck、当前 work harness 检查和 Electron 实测。phase 切回 verify。

## verify 证据

- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- `pnpm test` 通过, 85 files / 615 tests passed; 仍有既有 React act warning, 测试结果通过。
- `pnpm harness:check` 通过。
- `pnpm harness:stats`: debt total=14, status=ok。
- `pnpm exec node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过, GH-91 Project 字段已同步。
- `pnpm exec node scripts/harness-projects.mjs check --strict` 未通过, 仅剩无关 active work `2026-06-03-gh-90-nav-header-ux-redesign` 的 Project 字段漂移。
- `pnpm harness:prepush` 未通过, 唯一失败项为 `harness:ci:baseline`: 当前分支最近 CI failure 是较早 SHA `38a132b` / run `26879287021`, 不是本任务 HEAD `b4ff154`。
- Electron agent 实例 `hooks-layout` 视觉/交互验收通过: screenshot `/tmp/berth-hooks-layout-desktop.png`; desktop connector path count=9; 滚动到 `Before a tool runs` 后左侧 `03` 高亮; 760px 视口无横向溢出且 connector display=none。
