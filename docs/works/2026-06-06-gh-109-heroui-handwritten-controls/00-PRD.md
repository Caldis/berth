# PRD 快照 (只读)

> 原始 PRD 的快照。任何阶段不回写。来源链接/页面 ID 记于此。

来源:
- 用户对话请求 (2026-06-06)
- GitHub Issue #109 — https://github.com/Caldis/berth/issues/109
- 承接 docs/issues/2026-06-05-IMPROVEMENT-heroui-migration-followup.md (GH-105 延后长尾)

## 正文

### 用户请求 (原文)
> 现在好了, 你现在帮我检查还有哪些组件你自己写的没有引用 heroui 里面相关组件的, 替换掉, 我现在看 header 的 input 就没有处理好

### 即时上下文
- 前一轮: 已把 `pages/sessions.tsx` 顶部"分组(项目/日期)"切换器从手写 `<button>` 段控改为 HeroUI `Tabs/Tab` (commit c27c446d)。本任务是把该思路推广到全 renderer 的手写控件。

### 用户意图拆解
1. 审计 renderer 中"自己手写、未复用 HeroUI / `@/components/ui` 设计系统"的 UI 组件, 给出清单。
2. 把存在 HeroUI 等价物的手写控件替换为对应 HeroUI 组件。
3. 明确痛点优先级最高: header (页头 / PageChrome) 的搜索 input 处理得不好, 优先用 HeroUI `Input` 重做。

### 范围边界 (待 explore 校准, 非快照承诺)
- 本任务聚焦"有 HeroUI 等价物的手写控件 / primitive": header 搜索 Input、原生 `<select>` (filter-bar ScopeSelect)、`<details>` 菜单 (hooks-lifecycle HookActions)、散落本地 Badge/pill → ui/Chip, 以及审计发现的其它手写 primitive。
- 不在本任务: 各密集页 section 卡片整体 restyle → Card; 复杂浮层 (search-dialog 命令面板键盘 nav / file-viewer-drawer drag-resize) 收敛 Modal/Drawer; 重复折叠统一 Accordion; bundle 按需 import。这些留在 heroui-migration-followup 按页推进或单开任务。
- 共享工作区: 只动本任务处理过的文件; 与 GH-105 (verify)、GH-108 (sessions 列表重设计) 范围交叉处需交叉引用、避免重叠改同文件。
