# 描述
- 顶部导航栏的 breadcrumb 与页面标题同时显示当前页名称, 造成重复。

# 重现步骤
- 打开任一带顶部导航栏的功能页, 例如记忆页。
- 查看导航栏左侧的 breadcrumb 与标题行。

# 预期结果
- breadcrumb 只表达上级上下文。
- 当前页名称只在导航栏标题行出现一次。

# 实际结果
- breadcrumb 显示 `指令 > 记忆`, 标题行再次显示 `记忆`。

# 解决方案
- `TopNavigation` 的 breadcrumb 只渲染 `sectionLabel` / `parentLabel`。
- 当前页名称保留在 `h1` 标题行。
- renderer 测试覆盖功能页、能力页、用量页和 session 详情页。

# 完成记录
- 完成日期: 2026-06-03
- 任务: `docs/works/2026-06-03-gh-90-nav-header-ux-redesign/`
- GitHub Issue: https://github.com/Caldis/berth/issues/90
