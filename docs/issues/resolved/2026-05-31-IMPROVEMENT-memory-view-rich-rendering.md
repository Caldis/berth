# 描述
记忆视图 (MemoryView) 的展示体验仍可增强, 属 `2026-05-30-memory-source-adapter-layer` 的后续增量:

# GitHub
- Issue: https://github.com/Caldis/berth/issues/22
- Number: #22
- State: CLOSED

- **Markdown 富渲染**: 当前正文用 `<pre whitespace-pre-wrap>` 纯文本 + 复用 inspector drawer "查看原始"。
  真正的 markdown 渲染 (标题/列表/代码块/`[[wiki链接]]`) 需要引入渲染库。
- **importance / tag 过滤**: 现仅有来源 (source) 过滤; 增加按 importance (core/active/archive) 与 tag 过滤。
- **`[[name]]` 双链解析**: united-memory 正文用 `[[name]]` 互链, 当前只用 frontmatter `links[]` 做关联跳转。

# 完成记录
- Work: `docs/works/_archive/2026-06-02-gh-22-memory-view-rich-rendering`
- Markdown renderer: `react-markdown@10.1.0` + `remark-gfm@4.0.1`
- Renderer: `src/renderer/src/components/memory/memory-view.tsx`
- Parser: `src/main/memory/sources/united-memory.ts`

# 验证
- `pnpm test -- tests/renderer/memory-view.test.tsx`
- `pnpm test -- tests/unit/memory-service.test.ts`
- `pnpm typecheck:web`
- `pnpm typecheck:node`
- `pnpm harness:check`
