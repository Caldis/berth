# 描述
- 部分普通按钮 hover 后直接使用深色 `accent` 背景, 但文字仍是前景色, 在浅色主题下形成黑底黑字或低对比状态。

# 重现步骤
- 打开会话、Status Line 或 Hooks 功能页。
- 将鼠标移到详情、查看原始文件、生命周期阶段等普通按钮或次级操作上。

# 预期结果
- 普通 hover 使用浅灰背景, 文本保持可读。
- 只有明确的选中态或搜索弹窗选中/hover 才使用深色 `accent`, 且必须配套反色文本。

# 实际结果
- 多个普通按钮使用裸 `hover:bg-accent`。
- Hooks 生命周期当前项使用深色背景, 但内部标题仍使用普通前景色。

# 解决方案
- 普通按钮和次级操作改为 `hover:bg-muted/70`。
- Hooks 生命周期当前项改为 `bg-foreground text-background`, 内部标题和描述使用反色文本。
- 保留搜索弹窗中同时设置 `hover:text-accent-foreground` 的深色交互。

# 完成记录
- 完成日期: 2026-06-03
- 任务: `docs/works/2026-06-03-gh-90-nav-header-ux-redesign/`
- GitHub Issue: https://github.com/Caldis/berth/issues/90
