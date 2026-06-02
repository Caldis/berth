# 需求分析 (Explore 产物)

## 现状理解

渲染端通过 `src/renderer/src/styles/globals.css` 定义 HSL 设计 token, Tailwind 类如 `bg-accent`、`text-primary`、`hsl(var(--chart-1))` 都从这里取值。

当前主品牌色仍偏蓝, accent 和 sidebar accent 是高饱和橙色:

- light: `--accent: 24.6 95% 53.1%`
- light: `--sidebar-accent: 24.6 95% 53.1%`
- dark: `--accent: 24.6 95% 53.1%`
- dark: `--sidebar-accent: 24.6 95% 53.1%`
- chart token 与 Usage 页面硬编码 palette 也复用了这组橙色。

这些值会影响侧边栏选中态、按钮 hover、表单 focus、Usage/Overview 图表等高频界面区域。warning / conflict 等语义状态色主要用 Tailwind 的 amber/yellow, 不属于品牌 accent, 应保留。

## 关联与依赖

- `globals.css`: 全局主题 token, 同时覆盖 light/dark。
- `src/renderer/src/pages/usage.tsx`: `CHART_COLORS` 当前硬编码具体 HSL, 和全局 token 脱节。
- `src/renderer/src/pages/overview.tsx`: 已用 `hsl(var(--chart-N))`, 只需跟随 token。
- 这次不改布局、不改组件结构、不改 i18n。

## 验收标准

1. 全局品牌 / accent / sidebar accent token 不再使用旧橙色 `24.6 95% 53.1%`。
2. 选中态和主操作在 light/dark 下使用中性高对比色, 接近黑白产品界面。
3. Usage 图表 palette 使用 `--chart-*` token, 不再硬编码旧品牌色。
4. warning / error / destructive 等语义状态色保持原有语义, 不被主题改动替换。
5. 本地目标测试、lint、typecheck、全量测试、harness 检查通过, 并完成本地界面截图验收。

## 界面质量与交互验收

- 现有页面是密度适中的桌面产品界面, 侧边栏和内容区都依赖 `accent` 表示 active/hover 状态。
- 主题方向采用克制的中性黑白: light 使用近黑 active, dark 使用近白 active。
- 图表保留可区分的低饱和颜色, 但旧橙色不再作为品牌主色出现。
- 不改变页面信息密度、组件结构、键盘可达性和 hover/focus 机制。

## 未决问题

无。
