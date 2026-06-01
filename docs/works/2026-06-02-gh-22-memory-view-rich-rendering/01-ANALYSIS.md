# 需求分析 (Explore 产物)

## 现状理解

目标页面仍是 `src/renderer/src/components/memory/memory-view.tsx`。当前状态:
- 正文用 `<pre>` 纯文本显示, 标题、列表、代码块和表格没有结构化样式。
- 过滤只有 source 和 search, 不能按 importance 或 tag 收窄结果。
- `united-memory` frontmatter 的 `links[]` 会显示为关联按钮; 正文里的 `[[name]]` 尚未参与链接关系。

相关解析代码在 `src/main/memory/sources/united-memory.ts`, 渲染测试在 `tests/renderer/memory-view.test.tsx`, 解析测试在 `tests/unit/memory-service.test.ts`。

## 关联与依赖

- 依赖候选: `react-markdown@10.1.0` + `remark-gfm@4.0.1`。
- npm 元数据: 两者均为 MIT、ESM、带 TypeScript 类型; `react-markdown` 文档说明其默认不使用 `dangerouslySetInnerHTML`, 支持组件覆盖与插件; `remark-gfm` 文档说明它支持表格、任务列表、删除线等 GFM 扩展。
- 项目是 Vite + React 19 renderer, 可直接使用 ESM 包。
- 不启用 raw HTML 插件, 避免把 memory 文件中的 HTML 当作可信内容注入页面。

参考:
- https://www.npmjs.com/package/react-markdown
- https://www.npmjs.com/package/remark-gfm

## 验收标准

1. MemoryView 正文以 markdown 结构渲染, 至少覆盖 heading、list、inline code、code block、link 和 GFM table/task list 的基础样式。
2. 正文中的 `[[note-name]]` 渲染为可点击按钮, 点击后按现有关联跳转逻辑定位目标 note。
3. `united-memory` 解析层从正文提取 `[[note-name]]`, 与 frontmatter `links[]` 合并去重。
4. MemoryView 支持 importance 过滤, 并只显示当前结果中有意义的选项数量。
5. MemoryView 支持 tag 过滤, tag 选项来自当前数据集并按使用量/名称排序。
6. 过滤条件、source 和 search 可组合; 清空过滤仍恢复全量结果。
7. 新依赖写入 `package.json` 与 `pnpm-lock.yaml`, 类型检查通过。

## 界面质量与交互验收

- 页面结构: 过滤区保持紧凑, 不把页面顶部变成厚工具栏。
- 信息密度: importance/tag 用 chip 形式, 默认只占一行到两行; tag 多时允许横向/换行, 不挤压正文。
- 主要用户路径: 搜索、按来源筛选、按重要性筛选、按标签筛选、展开阅读、点击正文双链。
- 可见状态: active filter 必须一眼可见; 清空过滤按钮只在有过滤时出现。
- 交互反馈: 双链沿用 GH-21 的短暂高亮反馈。
- 响应式: 小宽度下过滤 chip 自动换行, 正文表格横向滚动。
- 可访问性: 双链是 button, filter chip 是 button, active 状态使用 `aria-pressed`。

## 未决问题

无。
