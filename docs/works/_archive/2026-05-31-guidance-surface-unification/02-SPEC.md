# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 设计目标

把当前分散的提示区域拆成三类组件, 用同一套视觉和文案规则覆盖:

1. 功能说明: 用户进入某个页面或 tab 时, 解释"这个东西是什么、什么时候用、Berth 怎么理解它"。
2. 空态引导: 当前没有数据、没有来源或筛选无结果时, 说明原因和下一步。
3. 状态/风险提示: 刷新失败、价格缺口、权限风险、健康检查等运行时状态。

Hooks 和状态栏现在已经包含较好的信息结构: 概念解释、provider 差异、可见数据、细节区和操作区。本次不复制它们的 UI, 而是把这套结构抽象出来, 再反向合并它们内部的重复说明。

## 数据契约

### FeatureGuideDefinition

新增通用功能说明定义, 放在 `src/renderer/src/lib/feature-guidance.ts`。

```ts
export interface FeatureGuideDefinition {
  id: string
  titleKey: string
  summaryKey: string
  insightKeys?: FeatureGuideInsight[]
  pointKeys?: string[]
  providerMappings?: FeatureGuideProviderMapping[]
  docLinks?: FeatureGuideDocLink[]
}

export interface FeatureGuideInsight {
  titleKey: string
  bodyKey: string
  agentView?: 'all' | 'claude' | 'codex'
}

export interface FeatureGuideProviderMapping {
  provider: string
  config: string
  meaningKey: string
}

export interface FeatureGuideDocLink {
  labelKey: string
  url: string
}

export interface FeatureGuideEvidence {
  labelKey: string
  value: number | string
  tone?: 'default' | 'warning'
}
```

说明:

- `insightKeys` 承接 hooks 的三张 tip 和状态栏的 Claude / Codex 模型说明卡, 可推广给 memory、sessions、permissions 等页面。
- `pointKeys`、`providerMappings`、`docLinks` 继续承接现有 `AssetGuidePanel` 的展开详情。
- `FeatureGuideEvidence` 继续用于资产数、来源数、provider 数、风险数, 并允许 sessions 传入会话数、项目数、模型数。
- 原 `asset-guidance.ts` 可以保留为过渡 re-export, 但新代码统一从 `feature-guidance.ts` 读取。

### EmptyState

扩展现有 `EmptyState`, 保持 `message` 兼容, 新增:

```ts
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title?: string
  message?: string
  description?: string
  action?: React.ReactNode
  className?: string
}
```

用途:

- `message` 旧调用继续可用。
- 新空态使用 `title + description + action`。
- memories、sessions、overview、usage、capabilities 空列表可以逐步改造, 不需要一次性重写所有页面。

### NoticePanel

新增 `src/renderer/src/components/shared/notice-panel.tsx`。

```ts
type NoticeTone = 'info' | 'warning' | 'error'

interface NoticePanelProps {
  tone?: NoticeTone
  title: string
  message?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}
```

用途:

- 替代局部手写的刷新失败、价格缺口、权限风险和提示条样式。
- `WarningBanner` 可以保留为 `NoticePanel tone="error"` 的薄封装, 避免一次性改太多调用。

## 模块结构 / 组件拆分

### 共享层

- 新增 `components/shared/feature-guide-panel.tsx`。
- 新增 `components/shared/notice-panel.tsx`。
- 扩展 `components/shared/empty-state.tsx`。
- 新增或迁移 `lib/feature-guidance.ts`, 统一管理 instructions、capabilities、sessions 的 guide 定义和 evidence builder。

`FeatureGuidePanel` 的首屏只展示:

- icon
- title
- summary
- evidence chips
- insight cards (最多 3 个, 文案短)
- details 按钮

展开后再展示:

- point list
- provider mapping
- doc links

这保留现有 `AssetGuidePanel` 的渐进披露, 但把"建议查看顺序"改成可选内容。不是所有 tab 都强行显示同一条路径。

### Instructions

- `Instructions` 对所有 tab 都查 `featureGuideMap.instructions[activeTab]`, 包括 memories。
- `conventions` 不再复用 `guidance.memories` 命名, 改成 `instructions.guidance.conventions`。
- 新增 `instructions.guidance.memories`, 说明 native Claude memory、united-memory、Berth 记忆列表的关系。
- `MemoryView` 不再自己承担页面级解释, 只保留搜索、来源筛选、刷新、列表和空态。
- `MemoryView` 的英文 fallback 要迁到 i18n, 避免中英文 locale 和组件内默认文案分裂。

### Capabilities

- 外层继续按 active tab 渲染一个 `FeatureGuidePanel`。
- `HooksLifecycleView` 删除顶部"Hooks 是什么?" intro 的概念说明, 保留并整理为:
  - view mode 控制
  - density 控制
  - agent enablement panel
  - health summary
  - lifecycle index
  - lifecycle / comparison 内容
- hooks 的 trigger / handler / difference 三个概念进入 `capabilities.guidance.hooks.insights`。
- `StatusLineIntro` 删除, 状态栏 Claude / Codex 模型说明进入 `capabilities.guidance.statusLine.insights`。
- `StatusLineSection` 只保留 summary、default Codex footer、status line cards 和 diagnostics。

### Sessions

- 新增 `sessions.guidance.index`。
- `Sessions` 标题下方渲染 `FeatureGuidePanel`, 说明 sessions 是本地会话记录、可按项目/日期查看、可进入详情查看资产和产物。
- evidence 使用当前列表数据计算: 会话数、项目数、模型数。
- 空态从 `No sessions found` 升级为 `title + description`, 说明可能是还没扫描到本地会话或当前筛选无结果。
- `SessionDetail` 暂不加大 guide, 避免详情页首屏变重。改为后续在各 section 的空态中补说明。

### Overview / Usage / Settings

这些页面不新增页面级 guide:

- Overview 是总览和健康状态, 不适合再加一块功能说明。
- Usage 已有成本边界、价格缺口、刷新失败等状态说明, 应迁移到 `NoticePanel` 风格, 不增加通用 guide。
- Settings 已有表单 helper 和 local source action hint, 继续保留局部说明。

但它们的空态或风险提示应逐步使用 `EmptyState` / `NoticePanel`, 保持视觉一致。

## i18n 规则

- 所有新增说明必须同时补 `en.json` 与 `zh.json`。
- 组件内不新增英文 fallback, 除非是暂时兼容旧 locale 的过渡代码。
- key 按功能归属放置:
  - `featureGuide.*`: 通用按钮、表头、evidence label。
  - `instructions.guidance.*`: 指令类说明。
  - `capabilities.guidance.*`: 能力类说明。
  - `sessions.guidance.*`: 会话类说明。
  - `memory.*`: 记忆列表和空态。

## 测试策略

目标测试:

- `tests/renderer/asset-guide-panel.test.tsx` 迁移或新增为 `feature-guide-panel.test.tsx`, 覆盖折叠/展开、insights、doc links、evidence。
- `tests/renderer/asset-guidance.test.ts` 迁移或新增为 `feature-guidance.test.ts`, 覆盖每个 guide 的 docs/provider mapping/必要文案结构。
- 新增或扩展 instructions 相关 renderer 测试, 验证 memories tab 有 guide, conventions 不再使用错误命名。
- 更新 `hooks-lifecycle-view.test.tsx`, 验证 hooks 内部不再重复显示概念 intro, 但 lifecycle 控制和健康摘要仍显示。
- 更新 `status-line-section.test.tsx`, 验证状态栏详情仍可读, 但 intro 去重。
- 更新 `sessions-pages.test.tsx`, 验证 sessions guide、empty state 和列表仍正常。

机械验证:

- `pnpm test -- tests/renderer/feature-guide-panel.test.tsx tests/renderer/feature-guidance.test.ts tests/renderer/hooks-lifecycle-view.test.tsx tests/renderer/status-line-section.test.tsx tests/renderer/sessions-pages.test.tsx`
- `pnpm typecheck:web`
- `pnpm harness:check`

最终收口再按风险补 `pnpm test`、`pnpm typecheck`、`pnpm build`。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 三类组件: FeatureGuidePanel / EmptyState / NoticePanel | 2, 3, 5 |
| FeatureGuideDefinition 支持 insights / evidence / details | 2, 3, 5 |
| memories 新增统一 guide, MemoryView 只管列表和空态 | 4, 7 |
| sessions 新增统一 guide 和更具体空态 | 4, 7 |
| hooks 合并重复 intro, 保留控制区、健康摘要和 lifecycle 内容 | 4, 6 |
| status line 合并重复 intro, 保留默认 footer 和诊断内容 | 4, 6 |
| Overview / Usage / Settings 不新增页面级 guide, 只统一空态和 notice | 2, 3 |
| renderer 目标测试与 web typecheck | 5 |
