# 描述
记忆视图 (MemoryView) 的展示体验仍可增强, 属 `2026-05-30-memory-source-adapter-layer` 的后续增量:
- **Markdown 富渲染**: 当前正文用 `<pre whitespace-pre-wrap>` 纯文本 + 复用 inspector drawer "查看原始"。
  真正的 markdown 渲染 (标题/列表/代码块/`[[wiki链接]]`) 需要引入渲染库 (如 react-markdown + remark),
  属新依赖决策, 未在本任务内擅自引入 (遵守 simplicity-first / 不加投机依赖)。
- **importance / tag 过滤**: 现仅有来源 (source) 过滤; 增加按 importance (core/active/archive) 与 tag 过滤。
- **`[[name]]` 双链解析**: united-memory 正文用 `[[name]]` 互链, 当前只用 frontmatter `links[]` 做关联跳转;
  可进一步解析正文内 `[[name]]` 并渲染为可跳转链接。

# 重现步骤
- 打开 berth → 指令 → 记忆 → 展开任一条目, 正文为纯文本; 无 importance/tag 过滤; 正文 `[[name]]` 不可点。

# 预期结果
- 正文按 markdown 渲染; 可按 importance/tag 过滤; 正文双链可点击跳转。

# 实际结果
- 正文纯文本; 仅来源过滤; 双链仅来自 frontmatter links。

# 解决方案
- 评估并引入轻量 markdown 渲染库 (需确认 bundle/许可/维护); 复用现有 inspector 或新建只读 markdown 视图。
- MemoryView 增加 importance/tag 过滤控件。
- 在 united-memory 解析层提取正文 `[[name]]` 合并进 links。
