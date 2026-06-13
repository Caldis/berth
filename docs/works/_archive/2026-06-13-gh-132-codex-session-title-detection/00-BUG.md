# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源:
- 用户请求, 2026-06-13: "请修复会话列表下 Codex 对话无法识别标题的问题"
- GitHub Issue: https://github.com/Caldis/berth/issues/132

## 复现步骤
1. 打开会话列表。
2. 查看 Codex 会话条目。
3. 截图中多个条目显示为 `Codex Session 019ebfe7`、`Codex Session 019ebee9` 这类 fallback 文案。

## 期望 vs 实际
- 期望: Codex 会话存在标题元数据或可解析标题时, 列表显示真实对话标题。
- 实际: 列表无法识别标题, 回退成 `Codex Session <id 前缀>`。
