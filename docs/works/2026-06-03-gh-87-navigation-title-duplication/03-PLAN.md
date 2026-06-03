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
- [ ] 任务 3: 视觉与 harness 验证
  - tests: `pnpm harness:check --work docs/works/2026-06-03-gh-87-navigation-title-duplication`
  - verify: agent-owned Electron 实例截图确认顶部栏与内容区不重复当前页名; 记录任何既有全局 harness 失败。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
