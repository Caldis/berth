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
6. 管理操作必须诚实反映 Agent 能力。Claude Code 没有官方单 hook disable, Codex 有 individual non-managed hook disable 概念但持久化格式未作为公开配置契约暴露。UI 不能把两边都画成同样的 toggle。
7. 本项目当前架构是只读扫描。启停 hooks 属于写用户配置, 必须作为显式管理动作进入编辑模式, 显示要修改的文件和字段, 写入后重新扫描。

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
5. 快速操作
   - 打开来源文件: 打开注册该 hook 的配置文件, 如 `settings.json` 或 `hooks.json`。
   - 打开来源目录: 打开来源文件所在目录。
   - 打开入口文件: 如果 hook command 能解析出本地脚本路径, 直接打开脚本文件。
   - 打开入口目录: 打开脚本所在目录。
   - 启停: 根据 agent/source capability 显示可用、不可用或需要确认的管理动作。
6. 注意事项
   - 只显示当前视角相关的限制。all 视角显示两边差异, 单 Agent 视角只显示当前 Agent 限制。

视觉细节:

- stage section 使用轻边框或上边框分隔, 不做嵌套卡片。
- native event 用小号 mono chip, 但事件名旁边必须有白话说明, 不能只扔 `PreToolUse`。
- support badge 三类: `supported`, `partial`, `unsupported`。Codex 的 tool hooks 标为 `partial`, 因为覆盖范围有限。
- 颜色只用于状态和当前选择, 不用大面积彩色块。
- 启停控件使用标准 switch / menu item, 不用自造交互。不可操作时显示 disabled 状态和一句原因。

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

新增 hook 管理能力模型:

```ts
export type HookManagementAction =
  | 'open-source-file'
  | 'open-source-directory'
  | 'open-entry-file'
  | 'open-entry-directory'
  | 'toggle-agent-hooks'
  | 'toggle-hook'

export type HookManagementAvailability =
  | 'available'
  | 'unavailable'
  | 'needs-confirmation'

export interface HookManagementState {
  action: HookManagementAction
  availability: HookManagementAvailability
  reasonKey?: string
  targetPath?: string
}
```

核心函数:

```ts
export function getVisibleHookStages(view: AgentView): HookLifecycleStage[]
export function getStageForEvent(eventType: string): HookLifecycleStage | null
export function groupHookAssetsByStage(assets: Asset[], view: AgentView): HookStageGroup[]
export function getVisibleStageSupport(stage: HookLifecycleStage, view: AgentView): HookAgentStageSupport[]
export function getHookManagementState(asset: Asset, view: AgentView): HookManagementState[]
```

规则:

- `all` 返回所有 stage, 包括某一 agent unsupported 的 stage, 便于展示差异。
- `claude` / `codex` 只返回当前 agent 非 `unsupported` 的 stage。
- hook asset 仍以 `meta.eventType` 绑定原生事件, 再映射到抽象 stage。
- 未识别 eventType 的 hook 放入 `environment` 或 `unknown` 不合适。本轮应显示在一个独立 “未识别事件” section, 并提示“Berth 还没有映射这个事件”。这避免丢数据。
- `open-*` 操作基于 `asset.path` 和从 `meta.command` 解析出的本地脚本路径。路径解析必须保守, 只打开明确存在的本地绝对路径或可解析到来源文件目录的相对路径。
- `toggle-*` 操作只在 agent/source capability 明确时可用。不可用时展示原因, 不隐藏。

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
  - `meta.managed`: managed 来源标记, 若能识别
  - `meta.enabled`: 当前是否启用, 仅在有可靠来源时填入
  - `meta.entryPaths`: 从 command 中保守提取出的本地脚本路径数组

不在本轮实现:

- repo-local `<repo>/.codex/hooks.json`
- inline `[hooks]` TOML
- plugin-bundled hooks
- managed hooks

这些能力需要真实 project roots / plugin source, 本轮 UI 与数据契约只预留展示能力, 不伪造扫描结果。

## 启停策略

### 默认状态

Hooks 页面默认是浏览状态。打开文件 / 打开目录属于只读动作, 可以直接可用。enable / disable 属于写配置动作, 需要显式确认。

### Claude Code

- 单个 hook: 不提供 toggle。显示原因: Claude Code 官方没有“保留配置但禁用单个 hook”的机制。
- 全部 hooks: 可设计为 source-level / agent-level 开关, 写入对应 settings 的 `disableAllHooks`。写入前必须显示目标文件和字段。
- managed hooks: 不允许从 user/project/local 设置禁用。UI 显示 managed badge 与禁用原因。
- 删除 hook 不属于 enable/disable, 本轮不做。

### Codex

- 全部 hooks: 可设计为 agent-level 开关, 写入 `[features].hooks = false/true`。如果 requirements/managed config 强制启用, UI 禁用并说明。
- 单个 hook: 只对 non-managed hook 显示可用入口。由于官方文档没有公开 individual disable 的持久化格式, 实现前必须先确认 Codex 本地持久化位置和格式; 未确认前 UI 显示“Codex 支持单个 non-managed hook 禁用, Berth 尚未接入写入”。
- managed hooks: 不允许从用户 hook browser 禁用, Berth 也不得提供 toggle。

### 写入 IPC

如果本轮实现 enable / disable, 需要新增受控 IPC:

```ts
hooks.setAgentHooksEnabled(agentId, scope, enabled)
hooks.setHookEnabled(assetId, enabled)
```

要求:

- 主进程解析当前文件, 做结构化更新, 不用字符串拼接。
- 写入前创建备份或使用原子写入。
- 写入后触发重新扫描。
- 渲染层显示成功 / 失败反馈。
- 对 managed / unknown / unsupported action 返回明确错误码。

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
  - 显示管理动作: open source file, open source folder, open entry file, open entry folder, enable/disable 状态。
- `src/renderer/src/components/capabilities/hook-management-menu.tsx`
  - 标准菜单承载文件/目录动作, 避免一行里堆太多按钮。
- `src/renderer/src/components/capabilities/hook-enable-control.tsx`
  - 只在 action 可用时显示 switch; 不可用时显示 disabled switch 或说明 badge。

如果为了保持改动小, 第一轮也可以先把组件放在 `capabilities.tsx` 内部, 但完成后文件会继续变大。推荐直接拆到 `components/capabilities/`。

### Main

- `src/main/adapters/codex/parsers.ts`
  - 增加 Codex hooks JSON parser。
- `src/main/adapters/codex/index.ts`
  - `scanAssets('capability')` 返回 Codex hooks。
  - `scanAll()` 合并 sessions 与 hooks。
  - `scanRoots()` 如存在 `~/.codex/hooks.json`, 可继续返回 `~/.codex` 或新增更精确 root 描述, 但不要破坏 settings scan directories 任务正在调整的 scan source 行为。
- `src/main/ipc/handlers.ts`
  - 如实现写操作, 新增 hooks 管理 handler; 只允许修改已扫描且可定位的 hook 配置。
- `src/shared/types/ipc.ts`
  - 如实现写操作, 增加 hooks 管理 IPC 类型与错误码。

### i18n

中英文同步新增:

- `capabilities.hooks.intro.*`
- `capabilities.hooks.stage.<stageId>.*`
- `capabilities.hooks.agentSupport.*`
- `capabilities.hooks.nativeEvents.*`
- `capabilities.hooks.emptyStage.*`
- `capabilities.hooks.limitations.*`
- `capabilities.hooks.actions.*`
- `capabilities.hooks.management.*`

中文以白话说明为主, 不直译英文术语。事件名保留原文, 但说明必须中文化。

## 交互规则

1. Agent 视角变化时, hooks 页面不需要二级切换。它直接从 `agentView` 推导可见 stage 与提示文案。
2. 搜索继续过滤 hook assets, 但不隐藏 stage 解释。搜索命中为空时, stage 保留, hook list 显示“当前筛选条件下没有 hook”。
3. scope filter 只影响 hook assets, 不影响 stage 说明。
4. `all` 视角下 hook list 应显示 Agent 标签, 单 Agent 视角不显示冗余 Agent 标签。
5. stage index 中的 hook count 使用当前筛选后的 hook 数, 同时保留总数提示, 避免用户以为 stage 消失。
6. hook command 可能很长, 必须单行截断, 展开后再显示完整命令。不要让命令撑破布局。
7. 所有解释文案可见于界面, hover tooltip 只能作为补充, 不能承载关键解释。
8. 打开文件 / 目录动作放在 hook row 的 `More` 菜单里, 常用的“打开来源文件”可以作为首项。
9. 单 hook enable/disable 不可用时, 不要隐藏开关后让用户误以为功能缺失。显示 disabled 状态和原因。
10. 全局禁用会影响该 Agent 的所有 hooks, 必须在页面说明区和确认文案里写清楚影响范围。

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
   - 从 command 中保守提取本地入口文件路径。
3. Renderer 测试:
   - `agentView='codex'` 时不出现 Claude Code 专属提示。
   - `agentView='claude'` 时不出现 Codex 专属提示。
   - `agentView='all'` 时出现差异对照。
   - 无 hook 时仍显示 stage 说明和教学型空状态。
   - Claude 单 hook toggle 不可用并显示原因。
   - Codex managed hook toggle 不可用并显示原因。
   - hook row 展示打开来源文件 / 目录动作。
4. IPC / 写入测试, 仅当本轮实现 enable / disable 写操作:
   - unsupported action 返回明确错误码。
   - managed hook 不可写。
   - 写入后重新扫描或返回更新后的状态。
5. 门禁:
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
| 打开来源文件、来源目录、入口文件、入口目录 | 10 |
| Agent-aware enable / disable 能力模型与不可用原因 | 11, 12 |
| typecheck/test/harness/Electron screenshot 门禁 | 9 |
