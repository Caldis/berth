# 描述
- 顶部导航栏需要作为持久顶层组件存在, 根据路由和页面 chrome 状态同步更新。
- 会话详情页需要完整 breadcrumb, 并在深层路由显示返回按钮。
- 导航栏需要使用 backdrop blur, 内容滚动层从其下方穿过且滚动条归属清楚。

# 重现步骤
- 从总览进入会话列表。
- 从会话列表进入任一会话详情。
- 查看导航栏出现、返回按钮、breadcrumb、右侧页面动作和内容滚动层级。

# 预期结果
- 导航栏不由叶页面直接渲染, 而是由顶层 `AppLayout` 持久承载。
- 首页为隐藏态, 功能页显示导航栏。
- 会话详情页展示 `会话 / 当前会话` breadcrumb 和返回按钮。
- 页面动作随路由变化进入或退出。
- 内容滚动区独立, 但视觉上可从半透明导航栏下方穿过。

# 实际结果
- 导航栏虽然位于 `AppLayout`, 但首页时返回空节点。
- 导航栏参与 flex 布局, 内容不能从下方穿过。
- 会话详情页 breadcrumb 只显示上级, 当前会话标题没有进入 breadcrumb。

# 解决方案
- `TopNavigation` 始终挂载, 用 `data-state` 管理 visible / hidden。
- `AppLayout` 将导航栏改为右侧内容区的 absolute 覆盖层, 内容滚动区使用测量到的导航高度设置 `paddingTop` 和 `scrollPaddingTop`。
- `TopNavigation` 对 session detail 使用完整 breadcrumb, 并用 `sr-only h1` 保留可访问标题。
- 使用 `backdrop-blur-xl` 和透明背景让滚动内容通过导航层形成模糊效果。

# 完成记录
- 完成日期: 2026-06-03
- 任务: `docs/works/2026-06-03-gh-90-nav-header-ux-redesign/`
- GitHub Issue: https://github.com/Caldis/berth/issues/90
