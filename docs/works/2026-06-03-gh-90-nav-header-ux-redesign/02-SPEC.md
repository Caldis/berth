# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增 renderer 内部 UI 契约, 不改 IPC / preload / shared 数据模型:

```ts
interface PageChromeConfig {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  sectionLabelKey?: string
  parentLabel?: React.ReactNode
  leading?: React.ReactNode
  actions?: React.ReactNode
  search?: {
    value: string
    onValueChange: (value: string) => void
    placeholder: string
    ariaLabel?: string
  }
  guide?: {
    definition: FeatureGuideDefinition
    evidence?: FeatureGuideEvidence[]
    agentView?: AgentView
  }
}
```

- `PageChromeProvider` 放在 `AppLayout` 内部, 用 local state 保存当前页面 chrome。页面通过 `usePageChrome(config, deps)` 注册, unmount 时清空。
- 静态 route 信息仍从 `nav-config.ts` 读取: section label 与 page label 用于普通功能页。
- 页面动态信息由页面传入: session detail 标题、返回按钮、页面级搜索输入、页面级筛选控件、help guide evidence。
- Overview 不注册 chrome, `AppLayout` 通过 pathname `/` 隐藏 `TopNavigation`。
- SearchDialog 仍由 `useAppStore().setSearchOpen(true)` 打开; 侧栏主搜索入口保留为全局搜索。顶部导航搜索由 `PageChromeConfig.search` 控制, 是页面级输入; `Ctrl/⌘K` 在页面搜索存在时聚焦该输入, 否则打开全局搜索。

## 任务分类与 debt
- type / maintenance.subtype:
  - feature / 不适用
- source.kind / refs:
  - user-request / GH-90
- debt.estimate:
  - incurred 5, repaid 0, net 5, scope global, risk medium, areas ui-ux + architecture, confidence low。
  - Design 后不调整。影响面与 Explore 一致, 没有新增跨进程契约。
- debt.final 预期:
  - incurred 5, repaid 1, net 4。通过抽出 PageChrome contract 归还一部分页面标题/工具栏重复结构。
- revisions:
  - 无。
- Project 字段同步:
  - Project item `PVTI_lAHOADXbEs4BZHvQzgukvig` 已在 0.0-new 同步为 In Progress; Design 不改远端字段。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/renderer/src/components/layout/page-chrome.tsx`
  - 新增 `PageChromeProvider`, `usePageChrome`, `useCurrentPageChrome`。
  - 只保存 renderer UI state, 不进入 Zustand。
- `src/renderer/src/components/layout/app-layout.tsx`
  - 由 `main.overflow-auto` 改为内容 shell: `flex flex-col overflow-hidden`。
  - `TopNavigation` 在 scroll container 外层; 内容 scroll container 使用 `flex-1 overflow-auto`。
  - `/` 隐藏 `TopNavigation`。
- `src/renderer/src/components/layout/top-navigation.tsx`
  - 渲染固定顶部导航: 分类 breadcrumb、页面标题、页面级搜索输入、可选 help、可选 leading/action slot。
  - Session detail 的 leading slot 放返回按钮; breadcrumb 展示“Sessions / 当前标题”。
  - Windows 保留 `pr-44`, titlebar drag/no-drag 区域覆盖所有按钮。
- `src/renderer/src/components/layout/sidebar.tsx`
  - 保留侧栏主搜索按钮。侧栏仍承载品牌、导航、全局搜索、agent view、project scope、settings。
- `src/renderer/src/components/shared/feature-guide-panel.tsx`
  - 保持页面说明内容模型。若需要, 增加 className/compact 兼容顶部弹层使用。
- `src/renderer/src/pages/sessions.tsx`
  - 删除内容区 `h1` 与 `FeatureGuidePanel`。
  - 将筛选 input、group segmented control、toolbar status 注册到 top nav actions。
- `src/renderer/src/pages/instructions.tsx`
  - 删除内容区 `h1`, `FilterBar`, `FeatureGuidePanel`。
  - 将 title、filter/scope、guide 注册到 top nav。
- `src/renderer/src/pages/capabilities.tsx`
  - 同 Instructions; permissions tab 不显示 filter, 但仍显示 help。
- `src/renderer/src/pages/usage.tsx`
  - 删除内容区标题/说明/time range 容器。
  - 将 title/subtitle/time range 注册到 top nav。
- `src/renderer/src/pages/session-detail.tsx`
  - 删除内容区返回/面包屑/标题块。
  - 将返回按钮、parent breadcrumb、动态标题注册到 top nav。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | Top nav `min-h-[72px]`, 两层结构: breadcrumb/title 与 actions。内容区不再放页面级标题、说明卡片、搜索条。 | Renderer tests 断言总览无 nav、功能页 nav 有 title/actions; Electron 截图检查列表首屏信息密度。 |
| 组件选择 / 设计系统一致性 | 继续用 Lucide + Tailwind v3 + 现有 neutral tokens。卡片半径不增大, 不加渐变和外发光。 | CSS class review; 视觉截图不出现大面积紫蓝渐变或新字体依赖。 |
| 交互反馈 / 状态切换 | 搜索、返回、help、segmented control 保留 hover/focus/active; help 可展开/收起; toolbar status `aria-live`。 | `@testing-library/react` 点击与 aria 断言。 |
| loading / empty / error / disabled / focus | 页面原 loading/empty/error 保留。Usage load error 与 retry 保留; toolbar action 不吞掉页面状态。 | `sessions-pages.test.tsx`, `top-navigation.test.tsx`, usage 相关测试。 |
| 响应式 / 可访问性 / 键盘可达 | title truncate; actions `flex-wrap`; narrow width 下工具条换行。breadcrumb 有 aria label; back/search/help 有 aria-label; input/select 有 label 或 aria-label。 | Renderer tests + Electron 窗口截图; manual tab order。 |
| 文案 / i18n / 数字和路径格式 | 所有新增 label 写 en/zh。保留现有 token、path、date、cost 格式函数。 | i18n tests 与现有 session/usage tests。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| PageChrome contract 与 TopNavigation 分类+标题+页面搜索+help+返回 | renderer | `tests/renderer/top-navigation.test.tsx` | `pnpm vitest run tests/renderer/top-navigation.test.tsx` | 不适用 |
| AppLayout 总览无 nav、功能页 nav 不在 scroll container 内 | renderer | 新增或扩展 `tests/renderer/app-layout.test.tsx` | `pnpm vitest run tests/renderer/app-layout.test.tsx` | 不适用 |
| Sessions 筛选/分组/status 迁移到 top nav 后行为不变 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| Instructions/Capabilities filter/scope/help 迁移后行为不变 | renderer | `tests/renderer/instructions-guidance.test.tsx`, `tests/renderer/capabilities-guidance.test.tsx` | `pnpm vitest run tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx` | 不适用 |
| Usage time range 迁移后请求参数不变 | renderer | `tests/renderer/sessions-pages.test.tsx` 或新增 usage 局部 test | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| Session detail back+breadcrumb+title 在 top nav, 内容区不重复 | renderer | `tests/renderer/sessions-pages.test.tsx`, `tests/renderer/top-navigation.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx tests/renderer/top-navigation.test.tsx` | 不适用 |
| Type / build / harness | local gate | 全项目 | `pnpm typecheck:web`, `pnpm harness:check` | 不适用 |
| 视觉实测 | manual / e2e | Electron dev app | `pnpm dev`, `pnpm dev:agent screenshot ...` | 自动单测不能评价导航高度、滚动条归属和首屏视觉密度。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Overview hides TopNavigation | 1 |
| AppLayout separates top nav and scroll container | 2 |
| Route/page chrome shows section + page title | 3 |
| Sidebar search retained + page search/filter in top nav | 4 |
| Sessions actions in top nav | 5 |
| Instructions/Capabilities actions and help in top nav | 6, 7 |
| Session detail back + breadcrumb + dynamic title | 8 |
| Windows/macOS titlebar behavior | 9 |
| Renderer tests and Electron screenshots | 10 |
