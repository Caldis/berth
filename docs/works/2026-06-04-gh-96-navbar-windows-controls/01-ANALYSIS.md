# Explore: 现状分析

## 原始输入
- 来源: 用户会话请求, GitHub Issue #96。
- 摘要: 首页总览也显示顶部导航栏; Windows 自绘窗口控制键在导航栏内垂直居中; Windows 导航栏右侧预留约 `13rem`, 避开右上角功能按钮和窗口控制键。

## 现状理解
- 进程/模块:
  - `src/main/index.ts`: Windows 下创建 `frame: false`、`titleBarStyle: 'hidden'` 的无边框窗口; 当前没有使用 Electron `titleBarOverlay`, 项目自己在 renderer 画窗口控制键。
  - `src/renderer/src/components/layout/app-layout.tsx`: 所有页面都渲染 `TopNavigation`, Windows 下额外渲染 `WindowControls`; 但首页用 `isOverviewRoute` 把内容顶部 offset 降到 `var(--berth-page-gutter)`。
  - `src/renderer/src/components/layout/top-navigation.tsx`: `routeChrome('/')` 当前返回 `null`, 首页没有 route chrome, 所以 header 进入 `data-state="hidden"`。
  - `src/renderer/src/components/layout/window-controls.tsx`: 控制键 `fixed right-3 top-1.5`, 高度与 `TopNavigation` 的 `min-h-[72px] py-3` 没有关联, 因此在 Windows 下会偏上。
- 当前行为:
  - 首页总览没有可见顶部导航栏, 与 sessions、usage、instructions、capabilities 等页面不一致。
  - 首页内容没有为顶部导航预留空间; 如果只让首页显示导航栏而不改 offset, 会压住 `overview-hero`。
  - Windows 控制键固定在视口顶部 `0.375rem`, 不是按导航栏高度居中。
  - `TopNavigation` 目前 Windows 只加 `pr-44` (11rem), 用户截图中右侧功能与控制键距离偏紧。

## 关联与依赖
- 调用链:
  - `App.tsx` 路由 `/` -> `Overview`。
  - `AppLayout` 包裹所有页面 -> `TopNavigation` 根据 `location` 和 `PageChrome` 计算标题、面包屑、动作区。
  - `nav-config.ts` 已包含 overview nav item, `findNavMatch('/')` 能返回 overview; 首页隐藏来自 `routeChrome('/')` 的特殊分支, 不是 nav 配置缺失。
  - `WindowControls` 通过 preload 的 `window.api.window.*` 调用主进程 IPC, 只涉及按钮位置和样式时不需要改 IPC。
- 数据/状态:
  - 顶部导航高度由 `TopNavigation` 的 `ResizeObserver` 回传给 `AppLayout`。
  - 内容滚动区域通过 CSS 变量 `--berth-page-top-offset` 预留顶部空间。
  - Windows 控制键目前没有接收导航栏高度, 只能靠固定 top 值定位。
- 外部契约:
  - Electron 官方 Custom Title Bar 文档说明: 隐藏标题栏后, Windows/Linux 要么启用窗口控制 overlay, 要么应用自己绘制控制键; 自定义标题栏需声明拖拽区域, 交互元素需排除拖拽。参考: https://www.electronjs.org/docs/latest/tutorial/custom-title-bar
  - 同页还说明启用 `titleBarOverlay` 后, DOM 不能占用窗口控制所在区域。当前项目未启用 overlay, 但右侧避让仍应保留, 因为控制键是固定覆盖层。

## 任务分类与 debt 校准
- type / maintenance.subtype: `feature`; 不适用 maintenance subtype。
- source.kind / refs: `user-request`; 关联 `https://github.com/Caldis/berth/issues/96`。
- debt estimate 修正: 暂不修正。
- scope / risk / areas / confidence: `module` / `medium` / `ui-ux` / `medium` 仍准确。顶部导航是共享 app shell, 但不改 IPC、数据模型或主进程窗口创建。
- revision: 无。

## 验收标准
1. `/` 路由的 `TopNavigation` 为 visible, 显示 overview 标题; 不为首页新增没有实际含义的上级分组。
2. `/` 路由内容区使用与其他页面一致的顶部 offset, 不被导航栏遮住。
3. Windows 下 `TopNavigation` 右侧 padding 为约 `13rem`, 使页面动作区避开窗口控制键。
4. Windows `WindowControls` 的容器按 `72px` 导航栏高度垂直居中, 不再固定贴近顶部。
5. macOS / 非 Windows 行为不引入窗口控制键, 原有导航栏结构不退化。

## 界面质量与交互验收
- 页面结构: `Sidebar` 固定左侧, `TopNavigation` 绝对定位在内容区域顶部, `main` 独立滚动。Overview 首屏是 hero、metric buttons、panels; 修改后应从导航栏下方开始。
- 设计系统: 使用现有 Tailwind token、`titlebar-drag` / `titlebar-no-drag`、系统按钮尺寸, 不新增视觉体系。
- 信息密度: 首页增加顶部导航后会多占约 72px; hero 仍保留原卡片密度, 不顺手改 Overview 内容。
- 主要路径: 用户从首页、Sessions、Usage、Instructions、Capabilities 之间切换时看到一致顶部导航。
- 可见状态: 顶部导航 visible/hidden 状态仍由 route/page chrome 决定; 本任务只取消首页特殊隐藏。
- 交互反馈: 右上角页面动作、搜索、guide 与 Windows 控制键都必须是 `titlebar-no-drag`, 可点击。
- 响应式: 顶部导航现有 `lg:grid-cols` 与 flex-wrap 保持; Windows 右侧 padding 只在 Windows 平台生效。
- 可访问性: 首页顶部导航保留 `aria-label="Breadcrumb"` 和 heading; 窗口控制键保留按钮 label 与 pressed 语义。

## 未决问题
- 无需向用户澄清。`13rem` 作为 Windows 右侧预留的设计参数先实现并通过实测截图校验。
