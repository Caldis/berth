# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源: user-request (会话直述) · GitHub Issue https://github.com/Caldis/berth/issues/99

## 正文

我们来优化应用 header, 目前 header 设计是"悬浮的" 不会占据垂直布局空间, 导致所有页面需要用额外的 padding 来避让 header。

我希望将 header 改回普通块布局, 使得页面内容可以不用添加额外的 padding top 也可以正常布局。

你需要检查所有页面确保布局准确, 启动团队对不同页面并行处理加快处理速度。
