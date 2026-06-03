# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 1. 新增/更新导航与布局 renderer tests, 先表达目标行为:
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx` (pass, 9 tests)
  - verify: 覆盖总览无 nav、功能页 section+title、search/help/back/action slot、scroll container 独立。
- [x] 2. 实现 `PageChromeProvider` + AppLayout 滚动分离 + TopNavigation 新结构:
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx` (pass, 9 tests); `pnpm typecheck:web` (pass)
  - verify: nav `min-h-[72px]`, 不位于内容 scroll container 内; help/back focus-visible 与 aria-label 完整; 用户澄清后侧栏主搜索入口保留, 顶部搜索改为页面级输入。
- [x] 3. 迁移 Sessions 顶部标题、说明、筛选、分组和 toolbar status:
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx tests/renderer/top-navigation.test.tsx tests/renderer/memory-view.test.tsx` (pass, 38 tests); `pnpm typecheck:web` (pass)
  - verify: Sessions 内容区无重复 `h1` / guide / filter; loading/empty/list/分批渲染状态保留; actions 可键盘访问。用户澄清后 Memories 搜索输入迁移到顶部导航, 内容区搜索栏移除, `Ctrl/⌘K` 聚焦页面搜索。
- [x] 4. 迁移 Instructions 与 Capabilities 的 title、filter/scope 与 help:
  - tests: `pnpm vitest run tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx tests/renderer/top-navigation.test.tsx` (pass, 19 tests); `pnpm typecheck:web` (pass)
  - verify: 除 Memories 以外的各 tab title 位于 nav; filter/scope 行为不变; permissions tab 不显示 filter; help 证据标签与 details 可访问。
- [x] 5. 迁移 Usage 与 Session detail 顶部 chrome:
  - tests: `pnpm vitest run tests/renderer/sessions-pages.test.tsx tests/renderer/top-navigation.test.tsx tests/renderer/usage-tooltip-label.test.tsx` (pass, 32 tests); `pnpm typecheck:web` (pass)
  - verify: Usage time range 请求参数不变; Session detail 返回按钮与 breadcrumb 在 nav; 内容区不重复顶部标题块。
- [x] 6. 局部与总门禁:
  - tests: `pnpm typecheck:web`; `pnpm harness:check`; `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/app-layout.test.tsx tests/renderer/sessions-pages.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx`
  - verify: `pnpm harness:prepush` (pass, 85 files / 611 tests); UI 状态、i18n、路径/数字格式相关断言全通过。
- [x] 7. Electron 视觉验收:
  - tests: manual evidence - `pnpm dev`; `pnpm dev:agent screenshot gh90-sessions --mode print-window`; `pnpm dev:agent screenshot gh90-session-detail --mode print-window`
  - verify: agent-owned Electron `gh90-nav-verify` + CDP route/screenshot evidence in `/tmp/berth-gh90-verify/`; Sessions / Memories / Usage / Session detail 均确认 top nav 与内容滚动区分离, 页面级搜索上移且 `Ctrl+K` 聚焦顶部搜索。macOS `dev:agent screenshot` 与 `screencapture` 受工具/权限限制, 见 `docs/friction/20260603-4.0-verify-macos-dev-agent-screenshot.md`。
- [x] 8. 修正总览无导航栏时的顶部留白:
  - tests: `pnpm vitest run tests/renderer/app-layout.test.tsx` (pass, 2 tests); `pnpm typecheck:web` (pass); `pnpm harness:check` (pass)
  - verify: 总览仍不渲染 `TopNavigation`, 内容外壳使用 `pt-6` 与 `px-6` 对齐; 功能页内容区仍保持 `pt-5`。
- [x] 9. 去除导航栏 breadcrumb 与页面标题重复:
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/sessions-pages.test.tsx` (pass, 31 tests); `pnpm typecheck:web` (pass); `pnpm harness:check` (pass)
  - verify: breadcrumb 只显示上级上下文; 当前页面名称只在导航栏标题行显示。
- [x] 10. 持久化导航栏、详情页完整 breadcrumb 与覆盖层滚动:
  - tests: `pnpm vitest run tests/renderer/app-layout.test.tsx tests/renderer/top-navigation.test.tsx tests/renderer/sessions-pages.test.tsx` (pass, 33 tests); `pnpm typecheck:web` (pass); `pnpm harness:check` (pass)
  - verify: `TopNavigation` 作为 `AppLayout` 顶层持久组件存在; 首页为隐藏态, 非首页从顶部进入; 详情页显示返回按钮与 `会话 / 当前会话` breadcrumb; 导航栏使用 `backdrop-blur-xl`; 内容滚动区独立并按导航栏测量高度保留顶部 scroll padding。agent-owned Electron `gh90-persistent-nav` CDP 证据确认 Sessions / detail / Overview 三态, 详情截图 `/tmp/berth-gh90-persistent-nav-detail.png`。
- [x] 11. 将页面说明改为 hover 图标按钮:
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/sessions-pages.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx` (pass, 43 tests); `pnpm typecheck:web` (pass); `pnpm harness:check` (pass)
  - verify: 导航栏只显示 `?` 图标按钮; hover/focus 打开说明叠层; 鼠标可从按钮移动到叠层内容且不关闭。agent-owned Electron `gh90-guide-hover` CDP 鼠标移动验证通过: button text empty, aria-label `Page guide`, hover 后 panel visible, 移入 panel 后仍 visible, 移出后关闭。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
