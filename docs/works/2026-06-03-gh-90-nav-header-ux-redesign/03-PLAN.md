# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 1. 新增/更新导航与布局 renderer tests, 先表达目标行为:
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx` (pass, 8 tests)
  - verify: 覆盖总览无 nav、功能页 section+title、search/help/back/action slot、scroll container 独立。
- [x] 2. 实现 `PageChromeProvider` + AppLayout 滚动分离 + TopNavigation 新结构:
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx` (pass, 8 tests); `pnpm typecheck:web` (pass)
  - verify: nav `min-h-[72px]`, 不位于内容 scroll container 内; search/help/back focus-visible 与 aria-label 完整。
- [ ] 3. 迁移 Sessions 顶部标题、说明、筛选、分组和 toolbar status:
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx tests/renderer/top-navigation.test.tsx`
  - verify: 内容区无重复 `h1` / guide / filter; loading/empty/list/分批渲染状态保留; actions 可键盘访问。
- [ ] 4. 迁移 Instructions 与 Capabilities 的 title、filter/scope 与 help:
  - tests: `pnpm vitest run tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/top-navigation.test.tsx`
  - verify: 各 tab title 位于 nav; filter/scope 行为不变; permissions tab 不显示 filter; help 证据标签与 details 可访问。
- [ ] 5. 迁移 Usage 与 Session detail 顶部 chrome:
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx tests/renderer/top-navigation.test.tsx`
  - verify: Usage time range 请求参数不变; Session detail 返回按钮与 breadcrumb 在 nav; 内容区不重复顶部标题块。
- [ ] 6. 局部与总门禁:
  - tests: `pnpm typecheck:web`; `pnpm harness:check`; `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx tests/renderer/sessions-pages.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx`
  - verify: UI 状态、i18n、路径/数字格式相关断言全通过。
- [ ] 7. Electron 视觉验收:
  - tests: manual evidence - `pnpm dev`; `pnpm dev:agent screenshot gh90-sessions --mode print-window`; `pnpm dev:agent screenshot gh90-session-detail --mode print-window`
  - verify: 使用实测窗口坐标截图; sessions 与 session detail 顶部导航固定在内容区顶部, 滚动条只属于内容区, 搜索/help/actions 不遮挡标题。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
