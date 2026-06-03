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
- [x] 任务 6:
  - 内容: 将 24px 页面 gutter 提升为全局 CSS 变量, 让 header、内容滚动区、Hooks sticky rail 与其余主页面外层页边距都引用同一值。
  - tests: `pnpm vitest run tests/renderer/app-layout.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/top-navigation.test.tsx` 通过, 39 tests passed; `pnpm typecheck:web` 通过。目标测试仍打印既有 React `act(...)` warning, 结果通过。
  - verify: Electron agent 实例 `gh91-page-gutter-audit` 逐页实测通过; `--berth-page-gutter=1.5rem`, page gutter=24px, scrollbar gutter=10px, 内容右 padding=14px; 总览、会话、记忆、约定、Skills、子代理、命令、输出模式、Agent Teams、MCP、Hooks、插件、状态栏、权限、环境变量、用量、会话详情的页面根节点到左侧滚动区/header/可见 scrollbar 的相关间距均为 24px。Hooks 额外复核: 左栏左侧=24px, 左栏到 header=24px, 右栏到 header=24px, 右栏到可见 scrollbar=24px, lifecycle rail sticky top=96px; 截图 `C:\Users\mail\AppData\Local\Temp\berth-agent-dev\gh91-page-gutter-audit\screenshot.png`; guard after 返回 `guard-ok`。
- [x] 任务 7:
  - 内容: 优化 Hooks 左右面板 connector: 竖线段改用左右面板间隙中心, active connector 提高对比度和线宽, scroll/smooth-scroll 期间的 connector 重算加 throttle, 避免点击后连续刷新造成闪烁。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 32 tests passed, 优化流程计时约 4.6s; `pnpm typecheck:web` 通过, 约 1.8s。
  - verify: Electron agent 实例 `gh91-connector-tuning` / `gh91-connector-tuning-final` 实测通过; connector path `Q` 的 x 坐标为 308, 与左右面板 gap center=308 一致; active connector `stroke-width=2.75`, class=`text-foreground/70`; 点击 `tool-before` 后对应 connector 变为 active, 8 次 50ms 采样 path distinct count=1, 未出现快速刷新闪烁; 截图 `C:\Users\mail\AppData\Local\Temp\berth-gh91-connector-tuning.png`; guard after 均返回 `guard-ok`。
- [x] 任务 8:
  - 内容: 使用 GH-93 后的优化验证流程对本任务进行对比校准, 记录目标测试、当前 work Project strict check、prepush 的实际结果和耗时。
  - tests: `pnpm exec node scripts/harness-projects.mjs check --strict --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过, 约 8.9s; `pnpm harness:check --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过, 约 0.55s; `pnpm harness:prepush` 不再 `spawn EINVAL`, 最近一次约 14.3s 后仅因既有远端 CI 基线 failure 失败。
  - verify: 默认全仓 `pnpm exec node scripts/harness-projects.mjs check --strict` 约 7.6s, 仍被无关 GH-90 Project debt 字段漂移挡住; 当前 work strict check 能通过, 说明 GH-93 新流程主要减少无关失败干扰, 但 Project 远端读取时间仍是网络成本。prepush 已从 Windows spawn 问题改为真实 CI baseline 失败, 本地 lint/typecheck/test/harness:check 均已实际启动。
- [x] 任务 9:
  - 内容: 校准 connector path bbox 的左右溢出: 保留左侧向左溢出以避免缝隙, 右侧也延伸同等距离, 让竖线段在 connector 自身 box 内居中。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 32 tests passed, 约 4.2s; `pnpm typecheck:web` 通过, 约 2.0s。
  - verify: Electron agent 实例 `gh91-connector-balance` 实测通过; active connector path `bendX=308`, `gapCenterX=308`, `leftExtent=18.67px`, `rightExtent=18.67px`, `stroke-width=2.75`, class=`text-foreground/70`; guard after 返回 `guard-ok`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- 2026-06-03: 用户反馈 hooks 页面左侧“生命周期”sticky/fixed 高度没有正确为 header 预留空间。该问题属于 GH-91 布局验收缺口, 已退回 implement 并追加任务 5。
- 2026-06-03: 用户进一步要求左栏左侧、左栏到 header、右栏到 header、右栏到 scrollbar 四个距离完全一致。已将 shell 内容 gutter 统一为 24px, 并按实际 scrollbar gutter 调整右侧 padding; 任务 5 通过目标测试、web typecheck、当前 work harness 检查和 Electron 实测。phase 切回 verify。
- 2026-06-03: 用户要求将该 24px 值作为全局变量, 并检查其余所有页面相关页边距与该值对齐。已退回 implement 并追加任务 6。
- 2026-06-03: 任务 6 已完成, `--berth-page-gutter` 作为全局 CSS 变量, AppLayout/TopNavigation/Hooks sticky rail 均引用该变量; Electron agent 逐页实测全部通过。phase 切回 verify。
- 2026-06-03: 用户要求继续优化 Hooks 左右面板 connector 的竖线居中、高亮强度和滚动刷新节流, 并用 GH-93 优化后的验证流程对比效率。已退回 implement 并追加任务 7、任务 8。
- 2026-06-03: 任务 7、任务 8 已完成; connector 竖线居中、高亮增强、scroll 重算节流和优化后验证流程对比均通过。phase 切回 verify。
- 2026-06-03: 用户反馈 connector 竖线仍在 path box 内稍偏右, 且左侧溢出正确、右侧也需要等量溢出。已退回 implement 并追加任务 9。
- 2026-06-03: 任务 9 已完成; connector 右侧延伸到与左侧相同的溢出距离, 竖线段在 path box 和左右面板间隙中心都居中。phase 切回 verify。

## verify 证据

- `pnpm vitest run tests/renderer/app-layout.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/top-navigation.test.tsx` 通过, 39 tests passed; 仍有既有 React `act(...)` warning, 测试结果通过。
- `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` 通过, 32 tests passed, 本轮计时约 4.6s。
- `pnpm typecheck:web` 通过, 本轮计时约 1.8s。
- `pnpm exec node scripts/harness-projects.mjs check --strict --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过, 本轮计时约 8.9s。
- `pnpm harness:check --work docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过, 本轮计时约 0.55s。
- `pnpm harness:prepush` 不再 `spawn EINVAL`, 最近一次计时约 14.3s; 本地 lint/typecheck/test/harness:check 启动并通过, full test 为 85 files / 617 tests passed; 唯一失败项为既有远端 `harness:ci:baseline` failure (`dba7bbf`, CI#26896930499)。
- Electron agent connector 实测通过: gap center=308, active connector path `Q` x=308; active `stroke-width=2.75`, class=`text-foreground/70`; 点击 `tool-before` 后 8 次 50ms 采样同一 connector path distinct count=1; 截图 `C:\Users\mail\AppData\Local\Temp\berth-gh91-connector-tuning.png`; guard after 返回 `guard-ok`。
- Electron agent connector 对称溢出复测通过: `bendX=308`, `gapCenterX=308`, `leftExtent=18.67px`, `rightExtent=18.67px`, active `stroke-width=2.75`; guard after 返回 `guard-ok`。
- Electron agent 实例 `gh91-page-gutter-audit` 逐页实测通过: 总览、会话、记忆、约定、Skills、子代理、命令、输出模式、Agent Teams、MCP、Hooks、插件、状态栏、权限、环境变量、用量、会话详情的页面级外边距均为 24px; Hooks 指定四项距离均为 24px; 截图 `C:\Users\mail\AppData\Local\Temp\berth-agent-dev\gh91-page-gutter-audit\screenshot.png`; guard after 返回 `guard-ok`。
- `pnpm lint` 通过。
- `pnpm typecheck` 通过。
- `pnpm test` 通过, 85 files / 615 tests passed; 仍有既有 React act warning, 测试结果通过。
- `pnpm harness:check` 通过。
- `pnpm harness:stats`: debt total=14, status=ok。
- `pnpm exec node scripts/harness-projects.mjs ensure docs/works/2026-06-03-gh-91-hooks-lifecycle-layout` 通过, GH-91 Project 字段已同步。
- `pnpm exec node scripts/harness-projects.mjs check --strict` 未通过, 仅剩无关 active work `2026-06-03-gh-90-nav-header-ux-redesign` 的 Project debt 字段漂移。
- `gh run list --branch master --limit 5` / `pnpm harness:ci:baseline` 显示远端 `origin/master` 最新 CI 仍为 failure, 最新失败提交是 `dba7bbf` (`docs: record agent teams runtime classification issue`)。
- `pnpm harness:prepush` 未通过, 失败已从 Windows `spawn EINVAL` 变为真实远端 `harness:ci:baseline` failure; 等价本地检查已启动并通过。
- Electron agent 实例 `hooks-layout` 视觉/交互验收通过: screenshot `/tmp/berth-hooks-layout-desktop.png`; desktop connector path count=9; 滚动到 `Before a tool runs` 后左侧 `03` 高亮; 760px 视口无横向溢出且 connector display=none。
