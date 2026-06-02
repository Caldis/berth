# 需求分析 (Explore 产物)

## 现状理解
这是渲染进程内的全局导航重构, 不需要修改 Electron 主进程、preload 或 IPC 契约。

当前入口链路:
- `src/renderer/src/App.tsx` 定义路由: `/`, `/sessions`, `/sessions/:id`, `/configuration/instructions`, `/configuration/capabilities`, `/usage`。
- `src/renderer/src/components/layout/nav-config.ts` 定义侧边栏导航。现在只有总览、会话、指令、能力、用量 5 个主入口。
- `src/renderer/src/components/layout/sidebar.tsx` 渲染侧边栏, 顶部品牌区同时放了 Agent 视角 `<select>`。
- `src/renderer/src/components/layout/top-navigation.tsx` 从 `navSections` 生成面包屑。
- `src/renderer/src/pages/instructions.tsx` 在页面内部用 `TabGroup` 切换 memories / conventions / skills / subagents / commands / outputModes / agentTeams。
- `src/renderer/src/pages/capabilities.tsx` 在页面内部用 `TabGroup` 和 `?tab=` 切换 mcp / hooks / plugins / statusLine / permissions / env。
- `src/renderer/src/components/layout/search-dialog.tsx` 和健康检查 target 仍指向旧的 `/configuration/capabilities?tab=hooks`。

这说明当前问题不是数据扫描或 IPC 问题, 而是主导航和页面内导航职责重复。`instructions` 和 `capabilities` 页面内部的 tab 实际承担了主导航职责, 侧边栏只暴露粗分类。

## 关联与依赖
关联模块:
- `nav-config.ts`: 新信息架构的单一配置入口。侧边栏、面包屑和搜索快捷入口应尽量复用这里, 避免路由文案分叉。
- `instructions.tsx` / `capabilities.tsx`: 需要从内部 tab 驱动改为路由驱动。页面仍可复用现有过滤、统计、卡片和详情组件。
- `search-dialog.tsx`: 搜索结果需要跳到新的一级入口, 同时旧路径应保持跳转兼容。
- i18n: 需要为一级菜单增加简短说明, 以及为新的分组补齐中英文文案。
- renderer tests: 现有 capabilities guidance 测试覆盖 `?tab=` 行为, 需要改为新路径并保留旧路径跳转测试。

不变边界:
- `agentView` 仍是全局过滤条件, 被 Overview、Sessions、Instructions、Capabilities、Usage 消费。
- `projectScope` 仍是项目/用户域过滤条件, 不应和 Agent 视角混在同一个控件里。
- session detail 内部的 overview/timeline/artifacts tab 是单个会话详情的局部视图, 不是本任务要提升的主导航。
- hooks 生命周期卡片内部的阶段导航是内容内高频操作, 不是主导航冲突来源。

## 任务分类与 debt 校准
- type / maintenance.subtype: feature / 不适用。
- source.kind / refs: `docs-issues`, 来源 `docs/issues/2026-06-02-FEATURE-sidebar-information-architecture.md`。
- debt estimate 修正: 初始 net=5 合理。实际会修改全局导航、两个页面、搜索跳转、i18n 和 renderer tests, 仍属于 global/high。
- scope / risk / areas / confidence: scope=global, risk=high, areas=architecture/ui-ux/testability, confidence 从 low 调整为 medium。当前已确认变更集中在渲染层, 不涉及 IPC, 风险主要来自路由迁移和旧 URL 兼容。
- revision: 在 `INDEX.md` 追加一次 explore 校准记录。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. 侧边栏把 instructions / capabilities 内的高频 tab 提升为可直接点击的一级菜单项, 并按清晰分组展示。
2. 页面内部不再用大 tab 承担主导航职责; 当前页面只展示对应模块内容、过滤器、详情和说明。
3. 旧路径 `/configuration/instructions` 与 `/configuration/capabilities?tab=...` 有跳转兼容, 不让搜索、健康检查或外部链接直接失效。
4. Agent 视角切换从品牌标题区移出, 放到更符合全局过滤语义的位置, 并和项目范围切换保持边界。
5. 侧边栏菜单在展开态有简短说明, 折叠态仍可通过 title/aria-label 识别, active 状态准确。
6. 搜索结果、面包屑、i18n 和 renderer 测试与新路由一致。
7. 新布局在窄窗口、长菜单、折叠侧边栏、键盘导航和 focus 状态下可用。

## 界面质量与交互验收
- 现有结构: 侧边栏是固定宽度、可折叠、可拖拽宽度的左栏; 页面顶部是面包屑; 内容区由 page 组件控制。
- 设计系统: 使用 Tailwind + lucide + 现有 `cn`、store 和 i18n。应保持 8px 左右圆角、低对比边框、少量 hover 反馈, 不新增重型动效。
- 信息密度: 侧边栏提升到十几个入口后, 每项需要两行结构: 标题 + 简短说明; 说明只在展开态展示。分组文案需要短, 避免营销化。
- 主要用户路径: 用户应能从侧边栏直接进入 Hooks、MCP、Skills、Commands、Permissions、Usage 等高频模块, 不再先进粗页面再找 tab。
- 可见状态: active 菜单项需要覆盖新路径和旧跳转目标; Agent 视角和项目范围应作为底部过滤区展示。
- 交互反馈: hover、active、focus-visible、collapsed title 都要明确。按钮文字不能溢出。
- 响应式: Electron 主窗口常见窄宽度下, 侧边栏可折叠; 长菜单使用内部滚动, 底部过滤区保持可见。
- 可访问性风险: 新 nav item 必须有 `aria-label` 或可读文本; Agent 视角不应只靠颜色表达; 旧 redirect 不能造成键盘焦点陷阱。

## 未决问题
无必须阻塞实现的问题。采用以下假设继续:
- 先完整迁移 instructions + capabilities 两个分组, 因为二者共享同一个问题, 只迁移一个会留下不一致。
- 旧 URL 保留跳转, 但新 UI 不再主动生成旧 URL。
- Settings 仍保留在侧边栏底部按钮, 不在本任务中提升为一级页面。
