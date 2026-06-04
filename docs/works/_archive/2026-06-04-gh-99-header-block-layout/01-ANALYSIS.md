# 需求分析 (Explore 产物)

## 现状理解

纯渲染进程 (renderer) 任务, 不涉及 main / preload / IPC / 数据层。

当前 header "悬浮" 机制 (floating overlay):
- `src/renderer/src/components/layout/top-navigation.tsx:117` — `<header>` 用 `absolute inset-x-0 top-0 z-20 ... min-h-[72px] backdrop-blur-xl bg-background/80`, 脱离文档流悬浮在内容滚动区上方; 内容从其半透明背景下方滚过。
- `src/renderer/src/components/layout/app-layout.tsx` — 悬浮补偿机制核心:
  - `topNavigationHeight` state (默认 72) + `TopNavigation` 的 `onHeightChange` 回调 + header 内 `ResizeObserver` 实测高度回写 (top-navigation.tsx:95-111)。
  - `pageTopOffset = calc(${topNavigationHeight}px + var(--berth-page-gutter))` 写入 CSS 变量 `--berth-page-top-offset` (app-layout.tsx:25,30)。
  - 内容容器 `contentStyle.paddingTop = var(--berth-page-top-offset)` 把首屏内容推到悬浮 header 下方 (app-layout.tsx:39); 滚动区 `scrollPaddingTop = var(--berth-page-top-offset)` 做锚点避让 (app-layout.tsx:28)。
- DOM 结构: `flex-col(relative)` 内 `TopNavigation`(absolute, 不占位) + `<main>`(滚动容器 `overflow-auto flex-1`, 占满全高); header 悬浮覆盖 `<main>` 顶部。

`--berth-page-top-offset` 的消费者 (全仓共 3 处):
1. `app-layout.tsx` — 产生者 + 内容 paddingTop / scrollPaddingTop。
2. `src/renderer/src/components/shared/category-jump-nav.tsx:34` — `lg:sticky lg:top-[var(--berth-page-top-offset,6rem)] lg:h-[calc(100dvh - var(--berth-page-top-offset,6rem))] lg:max-h-[...]`。用于 sessions / instructions 的左侧类目跳转栏。
3. `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx:117` — `lg:sticky lg:top-[var(--berth-page-top-offset,6rem)] lg:max-h-[calc(100dvh - var(--berth-page-top-offset,6rem) - var(--berth-page-gutter,1.5rem))]`。capabilities/hooks 的生命周期左栏。

CSS 变量定义: `src/renderer/src/styles/globals.css:27` 仅定义 `--berth-page-gutter: 1.5rem`; `--berth-page-top-offset` 由 AppLayout 运行时注入 (无 CSS 静态定义, 故 sticky 用 `,6rem` fallback)。

Windows 控件: `src/renderer/src/components/layout/window-controls.tsx` 接收 `navigationHeight` (默认 72), 以 `top: max(72, navHeight)/2` + `-translate-y-1/2` 做固定右上覆盖层垂直居中; AppLayout 把实测 `topNavigationHeight` 传入。

## 关联与依赖

- 6 个路由页面 (overview / sessions / session-detail / instructions / capabilities / usage) **均不**在自身根容器加 padding-top / margin-top / 固定高度 / 定位来避让 header; 避让 100% 由 AppLayout 中央 `contentStyle.paddingTop` 承担。并行子代理逐页审计确认 (见下表)。
- 页面顶部信息 (标题/面包屑/操作/搜索/guide) 经 `usePageChrome()` → `PageChromeProvider` → `TopNavigation` 渲染; overview 走路由自动推导, 其余页显式注册。此链路与"悬浮 vs 块布局"无关, 不改动。
- macOS 红绿灯拖拽带在 **sidebar.tsx:81** (`{isMac && titlebar-drag h-9}`), **不在** top-navigation; header 改动不影响 macOS 红绿灯。
- header 的 `titlebar-drag` 提供无边框窗口拖拽区, 块布局后需保留。

逐页审计结论 (5 个并行 Explore 子代理):

| 页面 | 依赖 `--berth-page-top-offset` | 本页根容器改动 |
|---|---|---|
| overview | 否 (根 `space-y-5 pb-8`) | 零 |
| sessions | 间接 (用 CategoryJumpNav) | 零 (改在 CategoryJumpNav) |
| session-detail | 否 (根 `space-y-6`, 无 sticky) | 零 |
| instructions | 间接 (用 CategoryJumpNav) | 零 (改在 CategoryJumpNav) |
| capabilities | 间接 (hooks 用 hooks-lifecycle sticky 左栏) | 零 (改在 hooks-lifecycle-view) |
| usage | 否 (根 `space-y-6`, PageErrorBoundary 包裹) | 零 |

代码改动面 (6 文件): `app-layout.tsx`、`top-navigation.tsx`、`globals.css`、`category-jump-nav.tsx`、`hooks-lifecycle-view.tsx`、`window-controls.tsx`。
测试影响面: `tests/renderer/app-layout.test.tsx` (断言 `absolute`/`backdrop-blur-xl`/top-offset/paddingTop)、`category-jump-nav.test.tsx`、`hooks-lifecycle-view.test.tsx`、`window-controls.test.tsx`、`top-navigation.test.tsx`; e2e `tests/e2e/app.e2e.ts`、`window-controls.e2e.ts` 需复核断言。

## 任务分类与 debt 校准
- type / maintenance.subtype: `maintenance` / `ui-ux` (重构布局架构, 移除悬浮补偿机制, 净偿还复杂度)。确认不变。
- source.kind / refs: `user-request` / Issue #99。
- debt estimate 修正: 维持 `incurred=2 repaid=5 net=-3`; explore 确认 6 页本体零改动, 改动面收敛到 6 文件 + ~6 测试, 估算与 new 初值一致, confidence 提升至 medium。
- scope / risk / areas / confidence: `module` / `medium` (全局布局所有页依赖, 但改动机械且页本体零改) / `[ui-ux]` / `medium`。
- revision: 见 INDEX.debt.revisions[] (explore: 确认改动面收敛、6 页零改, confidence low→medium)。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. **块布局**: `TopNavigation` 不再 `absolute` 定位, 作为 flex 子项占据垂直空间; `<main>` 自然位于 header 下方, header 不再覆盖滚动区。
2. **内容无避让 padding**: AppLayout 内容容器 `paddingTop` 不再为 header 高度补偿值, 改为常规 `var(--berth-page-gutter)`; 移除 `--berth-page-top-offset` 测高/补偿链路 (或简化为静态常量)。
3. **测高机制移除/简化**: 移除 `ResizeObserver` 实测 header 高度 → `onHeightChange` → `topNavigationHeight` state 链路 (除非 design 论证必须保留)。
4. **sticky 子导航定位正确**: CategoryJumpNav (sessions/instructions) 与 hooks-lifecycle 左栏 (capabilities/hooks) 在 lg+ 视口仍正确贴附于内容区顶部 (距顶 gutter), 不出现"重复偏移下移一个 header 高度"或被 header 遮挡; 内部滚动高度边界不溢出可视区。
5. **首屏无遮挡/无多余空白**: 6 个路由页首屏内容紧随 header 之下, 既不被遮挡也无额外空白带。
6. **Windows window-controls 对齐**: Windows 下右上窗口控制键与 header 行垂直对齐正确。
7. **macOS 红绿灯/拖拽**: macOS 红绿灯区 (sidebar) 不受影响; header 标题栏拖拽区 (`titlebar-drag`) 仍可拖动窗口。
8. **测试同步**: 受影响的 renderer 单测与 e2e 断言更新为块布局事实, 全量 `pnpm harness:check` + 目标测试通过。

## 界面质量与交互验收

- **现有页面结构**: 左 Sidebar (固定宽, 可折叠) + 右内容区 (顶部 header + 可滚动 `<main>`)。header 内容: 面包屑/标题 (左) + 操作/guide/搜索 (右), lg 单行栅格 `grid-cols-[minmax(0,1fr)_auto]`, max-lg 堆叠。
- **设计系统**: Tailwind + shadcn; 间距统一用 `--berth-page-gutter` (1.5rem); header `min-h-[72px] py-3`; 颜色用 HSL CSS 变量 (light/dark)。
- **信息密度**: 内容区卡片化 (`rounded-xl border bg-card`), `space-y-{4,5,6}` 垂直堆叠; 类目页用左侧 `w-48` sticky 跳转栏 + 右主列表双栏。
- **主要用户路径**: 侧栏切换路由 → header 反映当前页标题/操作 → 内容区滚动浏览; 类目页用左栏跳转锚点。
- **可见状态**: 各页有独立 skeleton (overview 分区 skeleton)、EmptyState、错误态 (usage NoticePanel / PageErrorBoundary); header 有 visible/hidden 状态 (未知路由时 `opacity-0 -translate-y-3 pointer-events-none`)。
- **交互反馈**: header 搜索框 ⌘K/Ctrl+K 提示; guide hover 面板; 操作按钮 active/hover/focus-visible ring。
- **响应式**: sticky 子导航仅 lg+ (`lg:sticky`), max-lg 退化为横向滚动条; header 栅格 lg 单行 / max-lg 堆叠。**关键**: sticky 高度计算只在 lg+ 生效, 而 header 在 lg+ 为单行近似定高 (~72px), 是块布局后 sticky 计算可否用常量替代测高的依据。
- **可访问性**: header `aria-hidden` 跟随 visibility; 面包屑 `nav[aria-label]`; CategoryJumpNav 用 radix NavigationMenu (`aria-current`)。
- **风险**: (a) header 块布局后 `visible/hidden` 动画语义需重定义 (absolute 时 hidden 不占位; block 时需决定是否塌缩高度, 同时保留 titlebar 拖拽区)。(b) sticky 高度/ top 取值需经验验证。

## 未决问题
留给 design 论证 (倾向自决 + 经验验证, 非必须向人澄清):
1. **测高 vs 常量**: sticky 子导航的高度边界依赖 header 高度。lg+ 视口 header 近似定高 72px (sticky 仅 lg+ 生效), 倾向用静态 CSS 常量 `--berth-page-header-height: 4.5rem` 取代 ResizeObserver 测高, 彻底移除测高链路; 需经验验证 72px 在带 subtitle 的页 (如 usage) 是否仍准确。
2. **sticky `top` 取值**: 块布局后 header 不再覆盖 `<main>`, sticky 元素相对 `<main>` 视口定位, `top` 应从 `var(--berth-page-top-offset)` 改为 `var(--berth-page-gutter)`; 高度从 `calc(100dvh - top-offset ...)` 改为 `calc(100dvh - header-height - 2*gutter)` (等价于原值)。design 锁定具体表达式。
3. **header hidden 态**: 块布局下 hidden (未知路由) 是否塌缩高度 vs 保留 72px titlebar 区。倾向保留 titlebar 区 (无边框窗口拖拽需要), 仅淡出内部内容。
4. **window-controls 居中**: 改用 header-height 常量做垂直居中, 移除 `navigationHeight` prop 传递链 (待 design 确认是否保留 prop 兼容)。
