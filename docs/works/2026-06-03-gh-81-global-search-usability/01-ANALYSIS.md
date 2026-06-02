# 需求分析 (Explore 产物)

## 现状理解

全局搜索跨三个进程边界:

- renderer: `src/renderer/src/components/layout/search-dialog.tsx` 负责 `Ctrl/Cmd+K` 弹窗、输入框、快捷入口和基础 focus trap。
- preload: `src/preload/index.ts` 暴露 `window.api.assets.search(query)`。
- main: `src/main/ipc/handlers.ts` 的 `assets:search` 调用 `src/main/engine/search.ts` 中的 MiniSearch 索引。

目前问题集中在两处:

1. 搜索弹窗没有把输入框值接到 `window.api.assets.search`。用户输入不会触发查询, UI 只显示 5 个固定快捷入口。
2. 主进程搜索索引只覆盖 `name/type/scope/category/path`, 没有覆盖 `agentId`、会话 project/model、hook command、MCP server 元数据、技能描述等常见可识别字段。`assets:search` 也没有调用 `ensureScanned()`, 在没有先触发全量扫描时可能拿到空资产和空索引。

现有 IPC 类型里 `src/shared/types/ipc.ts` 已定义 `SearchResult`, 但 `src/preload/index.d.ts` 仍把 `assets.search` 标成 `Promise<unknown[]>`, 渲染层无法获得可靠类型。

## 关联与依赖

- `AppLayout -> SearchDialog`: 搜索弹窗挂在全局布局, 用户在任意页面都能打开。
- `AppLayout -> useAssets()`: 当前应用启动后通常会扫描资产, 但搜索功能不能依赖这个副作用。
- `assets:scan-all`: 扫描完成后会 `search.buildIndex(result.assets)`。
- `assets:search`: 当前只读 `scanner.getAllAssets()` 和已有索引, 不保证扫描或索引已经准备好。
- `project-scope:activate`: 项目范围变化会刷新扫描结果; 搜索必须使用当前 scanner 的资产集合。
- `react-router-dom`: 可导航路由包括 `/`, `/sessions`, `/sessions/:id`, `/configuration/instructions`, `/configuration/capabilities`, `/usage`。

## 用户可见字段审计

搜索结果至少需要展示:

- 主标题: `asset.name`。
- 类型: `asset.type` 的可读标签。
- 来源: `agentId`、`scope`、`category`。
- 位置: `path` 或 `meta.transcriptPath`。
- 匹配提示: 命中的字段名和片段, 避免用户不知道为什么返回。
- 会话补充字段: `meta.project`、`meta.projectPath`、`meta.model`、`startedAt/endedAt` 中能稳定展示的短信息。
- Hook/MCP/Skill 补充字段: `meta.command`、`meta.event`、`meta.matcher`、`meta.description`、`meta.serverName` 等常见元数据。

不把 `raw` 全文作为默认索引字段。原因是原文可能大且包含敏感内容, 当前任务先修复可用性和主要元数据覆盖。

## 任务分类与 debt 校准

- type: bug, 初始分类准确。
- source.kind: docs-issues, 准确。
- debt estimate 修正: incurred 4 / repaid 0 / net 4 保持不变。
- scope / risk / areas / confidence: 仍是 cross-process + high, 因为涉及 main/preload/renderer/tests; confidence 从 low 调整为 medium, 代码路径已确认。
- revision: 记录在 `INDEX.md`。

## 验收标准

1. 打开全局搜索后, 输入已知资产关键词会调用 `assets:search` 并展示真实结果。
2. 结果覆盖主要资产元数据: session project/model/path, hook command/event, skill/command/MCP 常见描述字段, 以及 asset 基础字段。
3. `assets:search` 在未预先扫描时也能返回当前资产结果, 不依赖 `useAssets()` 的启动副作用。
4. 结果行能显示标题、类型、Agent、作用域、路径和匹配字段, 用户能判断来源。
5. 空结果、加载、错误状态均可见且有中英文文案。
6. 键盘操作可用: `Ctrl/Cmd+K` 打开、输入框获得焦点、`Escape` 关闭、`Tab` 留在弹窗内、`ArrowUp/ArrowDown` 切换结果、`Enter` 打开选中项。
7. 空查询时保留快捷入口; 非空查询时以结果列表为主。
8. 能导航的结果直接跳转到对应页面: session 到 `/sessions/:id`, instruction 到 `/configuration/instructions`, capability/hook/mcp/permission/plugin 到 `/configuration/capabilities`, usage-data 到 `/usage`; 不能精确导航的结果至少进入相关页面。
9. 自动化测试覆盖搜索引擎元数据索引、搜索弹窗状态、结果渲染和键盘选择。

## 界面质量与交互验收

当前弹窗是居中的 command palette, 宽度 `max-w-lg`, 使用 `bg-popover`、`border-border`、`hover:bg-accent`。这个形态适合全局搜索, 不需要改成页面级视图。

需要修复的界面问题:

- 信息密度不足: 用户输入后仍只看到快捷入口, 没有结果。
- 状态缺失: 没有 loading / empty / error。
- 交互反馈缺失: 没有选中结果状态, 键盘 Enter 不可用。
- 来源不可辨认: 当前没有结果行, 后续结果不能只展示标题。
- 响应式风险: 弹窗最大高度固定, 结果行要控制文本截断, 不能因为路径很长撑开。
- 可访问性风险: 结果列表应有稳定的可聚焦按钮和 `aria-selected`。

设计方向保持克制的黑白/中性色 command palette: 紧凑列表、清楚层级、少解释文案, 用标签表达类型和来源, 不新增说明卡片。

## 未决问题

无需要用户澄清的 PRD 级问题。默认范围是“元数据优先搜索”, 不搜索资产 raw 全文; 后续如果需要全文搜索, 应作为新功能单独设计。
