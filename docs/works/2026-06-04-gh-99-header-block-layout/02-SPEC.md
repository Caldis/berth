# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 核心设计取舍

**关键架构事实**: `TopNavigation` 在 DOM 中本就是滚动容器 `<main>` 的**兄弟节点**, 位于 `flex-col` 内 `<main>` 之上。当前仅靠 `absolute inset-x-0 top-0` 让它脱流悬浮覆盖 `<main>` 顶部。

**方案**: 移除 `absolute`, 让 header 回归普通 flex 子项。`flex-col` 自然成为 `[header(自动高度)] + [main(flex-1, 内部滚动)]`:
- header 持久可见且占据垂直空间 (无需 `sticky` —— 它在滚动容器之外); (验收 1)
- `<main>` 自然位于 header 下方, header 不再覆盖滚动区, 内容无需 header 高度补偿; (验收 1,5)
- 内容容器 `paddingTop` 从 header 高度补偿值改为常规 `var(--berth-page-gutter)`。(验收 2)

**测高机制移除 (验收 3)**: header 块布局后, 内容避让由文档流自然完成, 不再需要实测 header 高度。移除 `ResizeObserver` 测高 → `onHeightChange` → `topNavigationHeight` state → 运行时注入 `--berth-page-top-offset` 整条链路。

**sticky 子导航 `top`/`height` 的区分 (验收 4)**: 两个 `lg:sticky` 子导航 (CategoryJumpNav, hooks-lifecycle 左栏) 的定位需区分参照系:
- `top` 相对**滚动容器** `<main>` —— main 顶部现已在 header 下方, 故 `top` 从 `var(--berth-page-top-offset)` 改为 `var(--berth-page-gutter)` (仅留内容 gutter)。
- `height`/`max-h` 基于 `100dvh` (整窗) —— rail 可用高度 = 整窗 − header − gutter, 仍需减去 "header+gutter"。

**`--berth-page-top-offset` 从运行时值改为静态 CSS 常量**: 定义 `--berth-page-top-offset: 6rem` (= header `min-h` 72px + gutter 24px = 96px = 6rem, 恰等于现有 className 里的 `,6rem` fallback)。语义仍准确 = "视口顶到内容起点的偏移"。rail 的 `height`/`max-h` 计算 (`calc(100dvh - var(--berth-page-top-offset) ...)`) **原样有效**, 只改 `top`。

**常量 vs 测高的依据**: sticky 仅 `lg:` 生效; 而所有使用 sticky 子导航的页面 (sessions/instructions/capabilities-hooks) 在 lg+ 视口下 header 均为单行、且无 subtitle, 高度恒为 `min-h-[72px]`=72px。故 lg+ 下 72px 常量对这些页面**精确**。max-lg 时 sticky 退化为横向滚动 (`lg:` 前缀), 不使用 dvh 高度计算; 内容避让仍由文档流 (real header height) 自然处理, 与常量无关。

## 数据契约
无 IPC / 数据模型变更。仅 renderer 布局与 CSS 变量契约:
- 移除运行时 `--berth-page-top-offset` 注入; 改为 globals.css 静态常量 `--berth-page-top-offset: 6rem`。
- `TopNavigation` 移除 `onHeightChange` prop。
- `WindowControls` 保留 `navigationHeight` prop (默认 72); AppLayout 不再传实测值, 用默认 72 (Windows header 块布局下恒 72px, 居中正确)。

## 任务分类与 debt
- type / maintenance.subtype: `maintenance` / `ui-ux`。
- source.kind / refs: `user-request` / Issue #99。
- debt.estimate: `incurred=2 repaid=5 net=-3 scope=module risk=medium areas=[ui-ux] confidence=medium`。design 后维持; 方案为纯删减 + 局部改值, 无新增抽象, 估算不变。
- debt.final 预期: `repaid` 实现移除测高链路 (ResizeObserver + state + 回调 + 运行时 CSS 注入) 后达成, net 约 -3。
- revisions: explore 已记一条 (low->medium); design 不再追加 (估算未变)。
- Project 字段同步: 由 `harness-projects.mjs done` 在 archive 前同步。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md renderer 边界。改动文件 (6, 均 renderer):

1. **`src/renderer/src/styles/globals.css`**: `:root` 内新增 `--berth-page-top-offset: 6rem;` (紧随 `--berth-page-gutter`)。(验收 2,4)
2. **`src/renderer/src/components/layout/top-navigation.tsx`** (验收 1,3,7):
   - 删除 `onHeightChange` prop 及其类型; 删除测高 `useLayoutEffect` (ResizeObserver) 与 `headerRef` (仅测高用)。
   - `<header>` className: 删 `absolute inset-x-0 top-0 z-20` 与 `backdrop-blur-xl`; `bg-background/80` → `bg-background`; 保留 `titlebar-drag flex min-h-[72px] shrink-0 items-center border-b border-border px-[var(--berth-page-gutter)] py-3`。
   - 保留 `isVisible` 语义与 `data-state`/`aria-hidden`; hidden 态删除 `-translate-y-3` (悬浮滑出动画在块布局无意义, 会留空隙), 改为仅 `pointer-events-none opacity-0`, header 仍占 `min-h-[72px]` 作为持久 titlebar 拖拽区。保留 `transition-[opacity,...]`。
3. **`src/renderer/src/components/layout/app-layout.tsx`** (验收 1,2,3):
   - 删除 `topNavigationHeight` state、`pageTopOffset`、`onHeightChange` 传参; `TopNavigation` 不再传 `onHeightChange`。
   - `scrollRegionStyle`: 删除 `--berth-page-top-offset` 注入; `scrollPaddingTop` → `var(--berth-page-gutter)`; 保留 `--berth-page-scrollbar-gutter`。
   - `contentStyle.paddingTop`: `var(--berth-page-top-offset)` → `var(--berth-page-gutter)`。
   - 保留 scrollbarGutter 测量 (与 header 无关, 处理滚动条宽度补偿)。
   - `WindowControls`: 不再传 `navigationHeight={topNavigationHeight}` (用默认 72)。
4. **`src/renderer/src/components/shared/category-jump-nav.tsx`** (验收 4): line 34 仅改 `lg:top-[var(--berth-page-top-offset,6rem)]` → `lg:top-[var(--berth-page-gutter,1.5rem)]`; `lg:h-[calc(...)]` 与 `lg:max-h-[calc(...)]` 保持 (用 `--berth-page-top-offset`)。
5. **`src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`** (验收 4): line 117 仅改 `lg:top-[var(--berth-page-top-offset,6rem)]` → `lg:top-[var(--berth-page-gutter,1.5rem)]`; `lg:max-h-[calc(...)]` 保持。
6. **`src/renderer/src/components/layout/window-controls.tsx`** (验收 6): 无需改动 (保留 `navigationHeight` 默认 72)。列入复核, 确认 AppLayout 停止传参后行为正确。

**6 个路由页面零改动** (验收 5): explore 已确认页面本体不依赖悬浮偏移, 避让全由 AppLayout 中央 paddingTop 承担。

**并行边界 / 多 Agent 协同**: 核心 5 文件共享 `--berth-page-top-offset` 契约且强耦合, 必须**顺序单点**完成 (并行会冲突)。`top-navigation.tsx`、`hooks-lifecycle-view.tsx` 当前有其他 Agent (GH-102) 未提交改动 —— 实现前必须 `git status` 复核, 仅在这些文件无外部未提交改动时再编辑提交; 编辑前重新 Read 取最新内容, 仅暂存本任务 hunk。逐页**验证**可并行 (6 路由独立)。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | header 由悬浮覆盖改为顶部块级条 (border-b 分隔), 内容区在其下方独立滚动; 密度不变 | 实测截图: 6 路由首屏内容紧贴 header 下方, 无遮挡、无多余空白带 (验收 5) |
| 组件选择 / 设计系统一致性 | header 改为不透明 `bg-background` + `border-b`, 去 `backdrop-blur`/半透明; 间距沿用 `--berth-page-gutter`; sticky 子导航贴附内容区顶部 gutter 处 | 截图对比 header 与内容边界清晰; sticky 栏在 lg+ 正确贴顶 (验收 4) |
| 交互反馈 / 状态切换 | header 搜索/guide/操作按钮交互不变; 滚动时 header 持久可见 (在滚动容器外) | 滚动内容时 header 不动; ⌘K/Ctrl+K、guide hover 正常 |
| loading / empty / error / disabled / focus | 各页 skeleton/empty/error 不变; header focus ring 不变 | 逐页切换确认状态渲染正常 |
| 响应式 / 可访问性 / 键盘可达 | sticky 仅 lg+; max-lg header 栅格堆叠仍占块级空间, 内容自然下推; `aria-hidden`/`data-state` 保留 | lg 与 max-lg 两档宽度截图; 键盘聚焦 header 元素正常 |
| 文案 / i18n / 数字和路径格式 | 无文案变更 | 不适用 |
| macOS 红绿灯 / Windows 控件 | 红绿灯在 sidebar 不受影响; Windows window-controls 用默认 72 居中 | 本机 (Windows) 实测 window-controls 与 header 行垂直对齐 (验收 6,7) |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| header 块布局: 不再 `absolute`/`backdrop-blur`, 占垂直空间 | renderer | `tests/renderer/app-layout.test.tsx` | `pnpm test:renderer app-layout` | — |
| 内容 paddingTop = gutter, 不再注入 `--berth-page-top-offset` 内联值, scrollPaddingTop = gutter | renderer | `tests/renderer/app-layout.test.tsx` | 同上 | — |
| `TopNavigation` 无 onHeightChange/测高仍正确渲染标题、visible/hidden 态 | renderer | `tests/renderer/top-navigation.test.tsx` | `pnpm test:renderer top-navigation` | — |
| CategoryJumpNav sticky `top` = gutter, height 计算保持 | renderer | `tests/renderer/category-jump-nav.test.tsx` | `pnpm test:renderer category-jump-nav` | — |
| hooks-lifecycle sticky `top` = gutter, max-h 保持 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test:renderer hooks-lifecycle-view` | — |
| window-controls 默认 72 居中 | renderer | `tests/renderer/window-controls.test.tsx` | `pnpm test:renderer window-controls` | — |
| 6 路由首屏布局准确 (无遮挡/无空白)、header 持久可见、sticky 贴顶、Windows 控件对齐 | manual (Electron 实测截图) | — | `pnpm dev` + 主进程实测窗口坐标裁剪 (见 .agents/workflow/4.0-verify.md) | 视觉/布局准确性无法纯单测断言, 须实测截图; 单测覆盖类名/样式契约 |
| 受影响 e2e 顶部导航断言 | e2e (复核) | `tests/e2e/app.e2e.ts`, `tests/e2e/window-controls.e2e.ts` | 按需 | 复核现有断言是否引用 `absolute`/offset, 同步更新 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| header 移除 absolute, 块级占位, 持久可见 | 1 |
| 内容 paddingTop → gutter, 移除 top-offset 注入 | 2 |
| 移除 ResizeObserver 测高链路 | 3 |
| sticky 子导航 top → gutter, height 计算保持 | 4 |
| 6 路由首屏无遮挡/无空白 (实测) | 5 |
| Windows window-controls 对齐 | 6 |
| macOS 红绿灯/titlebar 拖拽不受影响 | 7 |
| 测试同步 + harness:check 全绿 | 8 |
