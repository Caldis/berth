# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 更新目标测试, 先固定期望行为
  - tests: 修改 `tests/renderer/top-navigation.test.tsx`, `tests/renderer/app-layout.test.tsx`, `tests/renderer/window-controls.test.tsx`; 先运行 `pnpm test -- tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx tests/renderer/window-controls.test.tsx`, 当前实现按预期失败 4 项。
  - verify: 已覆盖首页导航 visible、首页顶部 offset、Windows `pr-52`、窗口控制键按 96px 导航高度居中。
- [x] 任务 2: 实现 renderer app shell 调整
  - tests: `pnpm test -- tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx tests/renderer/window-controls.test.tsx` 通过, 3 files / 16 tests。
  - verify: 首页与其他页面共享导航栏; Overview 内容使用导航栏 offset; Windows 控制键按导航栏高度居中; 右侧动作区使用 13rem 避让; 非 Windows 不渲染控制键的既有逻辑未改。
- [ ] 任务 3: 收口检查与视觉验收
  - tests: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-04-gh-96-navbar-windows-controls`; verify 阶段跑全局 `pnpm harness:check`。
  - verify: Windows 实测或 Electron/Playwright 截图确认顶部导航、控制键居中和右侧避让; 记录测试证据。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
