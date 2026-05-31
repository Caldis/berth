# 需求分析 (Explore 产物)

## 现状理解

本任务只涉及渲染层 UI 和 i18n 文案。没有发现需要改主进程、preload 或 IPC 契约的证据。

真实渲染入口:

- `src/renderer/src/components/shared/asset-guide-panel.tsx`: 当前唯一接近"功能提示/指引"的共享组件。它包含标题、摘要、证据数字、固定建议路径、展开后的要点、provider 映射和文档链接。
- `src/renderer/src/lib/asset-guidance.ts`: 维护 instructions / capabilities 下各 tab 的 guide 定义。
- `src/renderer/src/pages/instructions.tsx`: 除 memories 外, 其他 instructions tab 都在列表前渲染 `AssetGuidePanel`。
- `src/renderer/src/pages/capabilities.tsx`: 所有 capabilities tab 都渲染 `AssetGuidePanel`。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`: hooks tab 内部又渲染一块大型 intro, 包含标题、说明、三张 tip、小型分段控件、密度控件、全局 hook 开关和健康检查摘要。
- `src/renderer/src/pages/capabilities.tsx` 的 `StatusLineSection`: status line tab 内部又渲染 `StatusLineIntro`, 包含标题、说明和 Claude / Codex 两张模型说明卡。
- `src/renderer/src/components/memory/memory-view.tsx`: memories tab 被 `instructions.tsx` 特判, 不显示 `AssetGuidePanel`。它只有搜索、来源筛选、刷新按钮、列表、三种空态。
- `src/renderer/src/pages/sessions.tsx`: sessions 页没有页面级 guide。它只有标题、搜索、分组切换和空态。
- `src/renderer/src/pages/session-detail.tsx`: 会话详情页没有 guide, 主要靠分区标题和空行文案解释。
- `src/renderer/src/components/shared/empty-state.tsx`: 共享空态只支持一个 message, 不支持标题、说明、动作或与 guide 的一致风格。
- `src/renderer/src/components/shared/warning-banner.tsx`: 共享警告只覆盖 destructive warning, 不适合信息型 guide 或中性提示。

逐模块现状:

| 模块 | 当前提示/指引 | 问题 |
|---|---|---|
| Instructions / conventions | 有 `AssetGuidePanel` | guide 文案实际描述 CLAUDE.md / AGENTS.md, 但 key 仍叫 memories, 容易误解。 |
| Instructions / memories | 无页面级 guide | 用户指出属实。只有空态 hint, 且 locale 里只有简单字符串, 组件内还有英文 fallback。 |
| Instructions / skills / subagents / commands / output modes / teams | 有 `AssetGuidePanel` | 样式和 capabilities 一致, 但固定"建议查看顺序"对所有 tab 都出现, 信息价值有限。 |
| Capabilities / MCP / plugins / permissions / env | 有 `AssetGuidePanel` | 基本一致, 但空态仍只是 `common.empty`, 缺少下一步。 |
| Capabilities / hooks | 有 `AssetGuidePanel` + hooks 内部 intro | 用户指出重复属实。两块都在解释 hooks 是什么, 但第二块还承载视图控制、开关和健康摘要。 |
| Capabilities / status line | 有 `AssetGuidePanel` + status line 内部 intro | 用户指出重复属实。两块都解释 status line 的用途和 provider 差异。 |
| Sessions | 无页面级 guide | 用户指出属实。页面只展示搜索和分组, 空态只有"未找到会话"。 |
| Session detail | 无页面级 guide | 不是首屏引导问题, 但缺少"这个详情页如何读"的低密度说明。 |
| Overview | 无通用 guide | 健康检查本身是状态提示, 不是功能引导。近期会话和费用图空态使用 `common.empty`, 信息不足。 |
| Usage | 有成本说明、价格缺口 warning、刷新失败 warning | 属于状态/边界说明, 不是通用功能 guide。已用渐进披露处理 pricing override 示例。 |
| Settings | 有局部 helper text 和 local source action hint | 属于表单/来源行内说明, 不应升级成页面级 guide。 |

结论: 当前有三种提示混在一起使用:

1. 页面或 tab 的功能指引: `AssetGuidePanel` 和 hooks/status line 自己写的 intro 都在做这件事。
2. 空态引导: `EmptyState` 及 memories 内部空态, 但能力不一致。
3. 状态/风险提示: health check、usage pricing gap、warning banner、diagnostic rows。

这三类应该分开建模。否则 hooks/status line 会重复, memories/sessions 会缺少说明, 空态会继续只能显示"空"。

## 关联与依赖

代码依赖:

- `instructions.tsx` 和 `capabilities.tsx` 都依赖 `AssetGuidePanel` 与 `asset-guidance.ts`。
- hooks 内部 intro、status line 内部 intro 目前是页面私有组件, 没有复用 `AssetGuidePanel` 的结构。
- memories 是 `Instructions` 页里的特例, 直接返回 `MemoryView`。因此要给 memories 补 guide, 可以在 `Instructions` 层取消特判, 或让 `MemoryView` 自己接收/渲染 guide。
- sessions 是独立页面, 若要加入统一 guide, 需要给 `asset-guidance.ts` 增加 session 类 guide, 或拆出更通用的 `FeatureGuidePanel`。
- i18n 目前已有 `assetGuide`、`instructions.guidance`、`capabilities.guidance`、`capabilities.hooks.intro`、`capabilities.statusLine.intro`、`memory`、`sessions` 等分散 key。统一设计会改 `en.json` / `zh.json`, 且当前这两份文件已有并行未提交改动, 实现阶段必须窄路径处理。
- 测试已有 `tests/renderer/asset-guide-panel.test.tsx`、`asset-guidance.test.ts`、`hooks-lifecycle-view.test.tsx`、`status-line-section.test.tsx`、`sessions-pages.test.tsx`。后续可以补 memory / sessions 的 guide 测试, 并调整 hooks / status line 的重复说明断言。

视觉依赖:

- 当前 product UI 多用边框卡片、12px 左右的局部圆角、紧凑标题、muted 文案。新组件应该保持安静, 不做营销式大块说明。
- 不宜把每个页面都塞一个大说明卡。页面级 guide 应默认短, 详情折叠, 空态再补下一步。
- hooks 的生命周期说明是核心内容, 不能因为去重而删掉。应该把"什么是 hooks"上移到统一 guide, 把 lifecycle / comparison / density / health 保留为功能工具区。

## 验收标准

1. 列出各主要功能页面是否有提示/指引、重复提示、缺失提示和重复文案。
2. 给出统一提示区分类: 页面级说明、功能级引导、空状态引导、状态/警告提示。
3. 给出首屏密度和渐进披露规则, 避免每页堆多个说明块。
4. 明确哪些页面需要新增提示, 哪些页面需要合并或删除重复提示。
5. 设计方案必须支持中英文 i18n, 并能用组件测试或页面测试验证。
6. hooks 和 status line 不再同时显示两块同主题的解释卡。
7. memories 和 sessions 至少有一个可见、低密度的功能指引入口。

## 未决问题

已由用户在 2026-05-31 澄清:

1. 目标是组件提取复用、风格统一、缺失内容补全。
2. Hooks / 状态栏里已有较好的提示模块, 要合并冗余并优化。
3. 这些模块里较成熟的设计意图和概念可以推广到其他说明模块。

设计阶段据此进入 implement, 不需要 blocked。
