# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 设计定位

本页面是产品型工具界面, 不是营销页。设计服务于一个具体任务: 让用户知道“我配置了哪些 hook, 它们会在 Agent 的哪一步运行, Claude Code 和 Codex 的行为差在哪里”。视觉策略采用 restrained product UI: 使用现有系统字体、现有 token、克制色彩和清晰层级, 不引入装饰性视觉。

使用场景: 开发者在桌面应用中排查本机 Agent 配置, 需要快速判断某条 hook 会不会影响当前选中的 Agent, 以及为什么某些生命周期在另一个 Agent 里不存在。

核心设计决定:

1. 顶层不再显示 vendor event name 列表, 改为抽象生命周期 stage。
2. 页面必须对“不理解生命周期”的用户友好, 所以每个 stage 都要有一句行为说明, 说明它关联到 Agent 的哪个动作。
3. 提示文案必须跟左侧 Agent 视角联动。`codex` 视角不展示 Claude Code 专属解释; `claude` 视角不展示 Codex 专属解释; `all` 视角展示差异对照。
4. 即使某个 stage 没有已安装 hook, 也应保留 stage 说明。否则用户只能看到“空”, 仍然无法理解生命周期。
5. Codex repo-local `.codex` hook 扫描暂不纳入本轮实现。原因是项目根来源仍和 settings scan directories 任务相关。本轮只实现 user-level Codex hooks 数据接入, UI 契约保留 project scope 的展示能力。

## 页面布局

替换当前单列事件折叠列表, 改成“说明区 + 生命周期阅读区”。

### 1. 页面说明区

位置: Hooks tab 内容顶部, FilterBar 下方或与 FilterBar 同级。保持 inline, 不使用 modal。

内容:

- 标题: `Hooks 是什么?`
- 一段 view-aware 说明:
  - all: hooks 是本机配置的脚本或处理器, 会在 Agent 会话、用户输入、工具调用、上下文压缩等节点运行。当前显示 Claude Code 与 Codex 的统一生命周期, 每个阶段会标明两个 Agent 的差异。
  - claude: hooks 是 Claude Code 在会话、工具调用、权限、通知等节点运行的处理器。当前只显示 Claude Code 支持的阶段和已扫描配置。
  - codex: hooks 是 Codex 在会话、用户输入、工具调用、权限、压缩和停止等节点运行的命令脚本。当前只显示 Codex 支持的阶段和已扫描配置。
- 三个短提示:
  - 触发点: hook 不会一直运行, 它只在特定 Agent 行为发生时运行。
  - 处理器: 大多数 hook 最终会执行一段命令或脚本。
  - 差异: 同名事件在不同 Agent 下覆盖范围可能不同, 例如 Codex 的 `PreToolUse` 只覆盖 Bash、`apply_patch` 和 MCP tool。

### 2. 生命周期阅读区

桌面布局:

- 左侧为 sticky lifecycle index, 宽约 260-300px。显示 stage 编号、名称、当前视角下 hook 数量、支持状态。
- 右侧为连续的 stage sections, 用户可以顺序阅读。左侧点击只负责滚动到对应 section, 不把内容藏到 tab 内。

窄屏布局:

- lifecycle index 变成横向滚动条或顶部 compact list。
- stage sections 单列显示。

这样比“只显示选中 stage 详情”更适合新手, 因为解释不会被折叠到不可见状态。

### 3. Stage section 信息结构

每个 stage section 使用同一结构:

1. stage header
   - 抽象名称: 例如“工具运行前”
   - 一句话行为解释: 例如“Agent 准备执行 shell、改文件或调用 MCP 工具之前。”
   - 当前视角下 hook 数量。
2. 行为说明
   - plain-language 文案, 不使用 lifecycle 术语堆叠。
3. Agent 支持说明
   - all 视角: 两行对照, Claude Code 一行、Codex 一行。每行包含 support badge、native event chips、限制说明。
   - 单 Agent 视角: 只显示当前 Agent 的一行说明, 不出现另一个 Agent 名称或事件。
4. 已安装 hooks
   - 按 native event 分组, 每条显示命令 / 名称、scope、matcher、来源文件入口。
   - 没有 hook 时显示教学型空状态: “这个阶段当前没有配置 hook, 但 Agent 仍然会经过这个阶段。”
5. 注意事项
   - 只显示当前视角相关的限制。all 视角显示两边差异, 单 Agent 视角只显示当前 Agent 限制。

视觉细节:

- stage section 使用轻边框或上边框分隔, 不做嵌套卡片。
- native event 用小号 mono chip, 但事件名旁边必须有白话说明, 不能只扔 `PreToolUse`。
- support badge 三类: `supported`, `partial`, `unsupported`。Codex 的 tool hooks 标为 `partial`, 因为覆盖范围有限。
- 颜色只用于状态和当前选择, 不用大面积彩色块。

## 数据契约

新增 renderer 纯数据模块:

`src/renderer/src/lib/hook-lifecycle.ts`

```ts
export type HookLifecycleStageId =
  | 'session-start'
  | 'user-input'
  | 'tool-before'
  | 'permission'
  | 'tool-after'
  | 'subagent'
  | 'context-maintenance'
  | 'session-stop'
  | 'environment'

export type HookLifecycleAgent = 'claude' | 'codex'
export type HookLifecycleSupport = 'supported' | 'partial' | 'unsupported'

export interface HookNativeEvent {
  eventType: string
  labelKey: string
  descriptionKey: string
}

export interface HookAgentStageSupport {
  agent: HookLifecycleAgent
  support: HookLifecycleSupport
  events: HookNativeEvent[]
  summaryKey: string
  limitationKeys: string[]
}

export interface HookLifecycleStage {
  id: HookLifecycleStageId
  order: number
  titleKey: string
  behaviorKey: string
  guideKey: string
  supports: Record<HookLifecycleAgent, HookAgentStageSupport>
}
```

核心函数:

```ts
export function getVisibleHookStages(view: AgentView): HookLifecycleStage[]
export function getStageForEvent(eventType: string): HookLifecycleStage | null
export function groupHookAssetsByStage(assets: Asset[], view: AgentView): HookStageGroup[]
export function getVisibleStageSupport(stage: HookLifecycleStage, view: AgentView): HookAgentStageSupport[]
```

规则:

- `all` 返回所有 stage, 包括某一 agent unsupported 的 stage, 便于展示差异。
- `claude` / `codex` 只返回当前 agent 非 `unsupported` 的 stage。
- hook asset 仍以 `meta.eventType` 绑定原生事件, 再映射到抽象 stage。
- 未识别 eventType 的 hook 放入 `environment` 或 `unknown` 不合适。本轮应显示在一个独立 “未识别事件” section, 并提示“Berth 还没有映射这个事件”。这避免丢数据。

Codex hooks 数据接入:

- 新增 `parseCodexHooksJson(filePath: string, scope: AssetScope): Asset[]`。
- 扫描 `~/.codex/hooks.json`。本轮不解析 `~/.codex/config.toml` inline hooks, 因项目当前没有 TOML parser, 且引入依赖需要单独评估。
- `Asset` 输出:
  - `agentId: 'codex'`
  - `category: 'capability'`
  - `type: 'hook'`
  - `scope: 'user'`
  - `meta.eventType`: Codex native event
  - `meta.matcher`: matcher 或 undefined
  - `meta.command`: command hook 的 command
  - `meta.hookType`: command / prompt / agent 等原始类型
  - `meta.supportNote`: 当 hookType 不是 command 或 async 为 true 时, 标记 Codex 当前会跳过该 handler

不在本轮实现:

- repo-local `<repo>/.codex/hooks.json`
- inline `[hooks]` TOML
- plugin-bundled hooks
- managed hooks

这些能力需要真实 project roots / plugin source, 本轮 UI 与数据契约只预留展示能力, 不伪造扫描结果。

## 模块结构 / 组件拆分

遵守 docs/ARCHITECTURE.md 的边界与约定。

### Renderer

- `src/renderer/src/lib/hook-lifecycle.ts`
  - 生命周期抽象、event 映射、stage 分组纯函数。
- `src/renderer/src/pages/capabilities.tsx`
  - 保留 capabilities tab 总体结构。
  - hooks tab 迁移到独立组件, 避免主文件继续膨胀。
- `src/renderer/src/components/capabilities/hooks-overview.tsx`
  - 顶部说明区, 根据 agentView 选择文案。
- `src/renderer/src/components/capabilities/hook-lifecycle-index.tsx`
  - 左侧 stage index。
- `src/renderer/src/components/capabilities/hook-stage-section.tsx`
  - stage section, 包含行为说明、Agent 支持说明、hook 列表。
- `src/renderer/src/components/capabilities/hook-asset-row.tsx`
  - 单条 hook 显示, 复用 `ScopeBadge` 或迁出共享。

如果为了保持改动小, 第一轮也可以先把组件放在 `capabilities.tsx` 内部, 但完成后文件会继续变大。推荐直接拆到 `components/capabilities/`。

### Main

- `src/main/adapters/codex/parsers.ts`
  - 增加 Codex hooks JSON parser。
- `src/main/adapters/codex/index.ts`
  - `scanAssets('capability')` 返回 Codex hooks。
  - `scanAll()` 合并 sessions 与 hooks。
  - `scanRoots()` 如存在 `~/.codex/hooks.json`, 可继续返回 `~/.codex` 或新增更精确 root 描述, 但不要破坏 settings scan directories 任务正在调整的 scan source 行为。

### i18n

中英文同步新增:

- `capabilities.hooks.intro.*`
- `capabilities.hooks.stage.<stageId>.*`
- `capabilities.hooks.agentSupport.*`
- `capabilities.hooks.nativeEvents.*`
- `capabilities.hooks.emptyStage.*`
- `capabilities.hooks.limitations.*`

中文以白话说明为主, 不直译英文术语。事件名保留原文, 但说明必须中文化。

## 交互规则

1. Agent 视角变化时, hooks 页面不需要二级切换。它直接从 `agentView` 推导可见 stage 与提示文案。
2. 搜索继续过滤 hook assets, 但不隐藏 stage 解释。搜索命中为空时, stage 保留, hook list 显示“当前筛选条件下没有 hook”。
3. scope filter 只影响 hook assets, 不影响 stage 说明。
4. `all` 视角下 hook list 应显示 Agent 标签, 单 Agent 视角不显示冗余 Agent 标签。
5. stage index 中的 hook count 使用当前筛选后的 hook 数, 同时保留总数提示, 避免用户以为 stage 消失。
6. hook command 可能很长, 必须单行截断, 展开后再显示完整命令。不要让命令撑破布局。
7. 所有解释文案可见于界面, hover tooltip 只能作为补充, 不能承载关键解释。

## 测试策略

1. `hook-lifecycle` 单元测试:
   - all/claude/codex 三种 view 的 stage 可见性。
   - Codex unsupported stage 在 codex 视角不出现。
   - 同一 native event 能映射到正确抽象 stage。
   - 未识别 event 不丢失。
2. Codex parser 单元测试:
   - 解析 `~/.codex/hooks.json` 的 nested handler 结构。
   - 生成 `agentId:'codex'`、`type:'hook'`、`meta.eventType`、`matcher`、`command`。
   - 非 command / async hook 保留但标记 support note。
3. Renderer 测试:
   - `agentView='codex'` 时不出现 Claude Code 专属提示。
   - `agentView='claude'` 时不出现 Codex 专属提示。
   - `agentView='all'` 时出现差异对照。
   - 无 hook 时仍显示 stage 说明和教学型空状态。
4. 门禁:
   - `pnpm harness:check`
   - `pnpm typecheck`
   - 相关 `pnpm test -- ...`
   - UI 实现后用 Electron 实测窗口坐标截图验收。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 抽象 stage 作为顶层 hooks 信息架构 | 1, 2, 3, 5 |
| Agent 视角联动文案与 stage 支持过滤 | 2, 3, 5, 6, 7 |
| stage section 内嵌白话解释、差异说明和教学型空状态 | 1, 2, 5, 7 |
| Codex user-level hooks JSON parser 与 adapter 接入 | 4, 6, 8 |
| `hook-lifecycle` 纯函数与测试 | 1, 2, 3, 5, 6, 8 |
| renderer tests 覆盖 all/claude/codex 文案差异 | 2, 3, 5, 7, 8 |
| typecheck/test/harness/Electron screenshot 门禁 | 9 |
