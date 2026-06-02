# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
GitHub Issue #60: https://github.com/Caldis/berth/issues/60

## 正文
Hooks lifecycle list 当前用 `prompt`、`http`、`mcp_tool` 等裸 handler type 作为行首 badge。这些是配置里的实现标识，不适合作为主要 UI 文案。

目标:
- 使用 Agent Capability Plugin hook schema 提供的 handler label 作为行首展示。
- 没有 schema 或缺少翻译时回退到原始 type，避免空白。
- 保留 JSON 原文展示，让用户仍能看到真实配置里的 `type`。

非目标:
- 不改 hook 解析、启用、禁用和恢复逻辑。
- 不重排 lifecycle 页面结构。
