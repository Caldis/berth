# 需求分析 (Explore 产物)

## 现状理解

`src/renderer/src/components/layout/sidebar.tsx` 是当前侧边栏实现。它在底部直接放置三个按钮: 主题循环、多语言切换、侧边栏折叠。`src/renderer/src/components/layout/nav-config.ts` 把 Settings 作为普通导航项放在侧边栏导航列表末尾。`src/renderer/src/pages/settings.tsx` 是完整设置页面, 通过 `/settings` 路由展示。

`src/renderer/src/App.tsx` 注册 `/settings` 路由。`src/renderer/src/components/layout/search-dialog.tsx` 也把 Settings 当作可跳转页面。

主题能力由 `src/renderer/src/components/theme-provider.tsx` 提供, 语言切换由 `react-i18next` 与 localStorage 维护。当前需求不改这些数据契约, 只改入口和展示方式。

`D:/Code/bobcorn/src/renderer/components/SideMenu/` 是参考对象。需要吸收它的底部设置入口与弹窗式设置面板方向, 但不照搬样式系统, 仍使用 berth 的 Tailwind token 和 lucide 图标。

## 关联与依赖

- Renderer layout: `AppLayout` 固定侧边栏宽度和内容区 margin, 侧边栏弹窗需在 renderer 层处理, 不涉及 Electron main/preload/IPC。
- Navigation: Settings 不应再作为普通侧边栏导航项。若保留 `/settings` 路由, 搜索对话框仍可能进入页面, 与“设置面板作为弹出窗口显示”不一致。
- Settings UI: 现有设置页包含 Appearance、Scanning、Scan Directories、About。移除侧边栏 theme/language 快捷按钮后, Appearance 设置仍应在设置面板中保留。
- Accessibility: 弹窗需要关闭按钮、遮罩点击关闭、Esc 关闭和明确的 `dialog` 语义。

## 验收标准

1. 侧边栏底部只保留设置按钮和折叠按钮, 不再直接显示主题按钮与语言按钮。
2. Settings 不再出现在侧边栏普通导航项中。
3. 点击底部设置按钮会打开设置弹窗, 而不是导航到独立设置页。
4. 设置弹窗内仍可切换主题、语言、扫描开关, 并可打开扫描目录和外部链接。
5. 设置弹窗支持关闭按钮、遮罩点击关闭、Esc 关闭。
6. 折叠侧边栏下设置按钮仍可点击, 图标尺寸、命中区域和布局稳定。
7. 搜索对话框不再把 Settings 当作页面跳转入口。
8. 变更通过 typecheck/lint/test, 并完成真实 UI 截图验收。

## 未决问题

无。用户已明确参考 bobcorn 侧边栏, 本次按产品 UI 的克制弹窗处理。

