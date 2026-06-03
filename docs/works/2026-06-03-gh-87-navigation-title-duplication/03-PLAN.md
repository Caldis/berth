# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 更新 `TopNavigation` 上下文计算与空 breadcrumb 渲染
  - tests: `pnpm test -- tests/renderer/top-navigation.test.tsx` (pass, 2026-06-03)
  - verify: 顶部栏不显示当前页标题; 无 crumb 时不渲染空 `nav`; `h1` 保留。
- [x] 任务 2: 更新 renderer 与 e2e 顶部栏断言
  - tests: `pnpm test -- tests/renderer/top-navigation.test.tsx` (pass, 2026-06-03); `pnpm build` (pass, 2026-06-03); `pnpm test:e2e -- tests/e2e/app.e2e.ts` (14 passed, 2026-06-03)
  - verify: EN/ZH breadcrumb 文案正确; Sidebar 导航仍可切换; 页面标题不变。
- [x] 任务 3: 视觉与 harness 验证
  - tests: `pnpm harness:check --work docs/works/2026-06-03-gh-87-navigation-title-duplication` (failed, 2026-06-03: only existing global `issues/` and `.agents/skills/opsx-*` drift listed; no `GH-87` work error)
  - verify: `pnpm dev:agent start --id gh87-nav-title --debug-port 9337 --json` + CDP DOM check confirmed `overview="" / Overview`, `sessions="WORK" / Sessions`, `skills="INSTRUCTIONS" / Skills`, `hooks="CAPABILITIES" / Hooks`, `usage="RUN" / Usage`; screenshot `/var/folders/v0/318dq8q959z29k7vx374rw400000gn/T/berth-agent-dev/gh87-nav-title/cdp-usage.png`; macOS System Events window-coordinate query was blocked, so actual-window crop could not be produced; `pnpm dev:agent stop gh87-nav-title --json` and guard after passed.

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
