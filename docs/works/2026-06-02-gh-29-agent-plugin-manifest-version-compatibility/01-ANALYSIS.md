# 需求分析 (Explore 产物)

## 现状理解

当前 Agent Capability Plugin 仍是内置 registry:

- `src/shared/types/agent-plugin.ts:10` 将 `AgentCapabilityPluginId` 限定为 `'claude-code' | 'codex'`。
- `src/shared/types/agent-plugin.ts:179` 的 `AgentCapabilityPlugin` 已包含 version、schemaVersion、builtin、enabled、detected、agentCompatibility、capabilities、permissions、sourceDescriptors、assetDescriptors、hookSchema、healthCheckDescriptors、sourceCoverage 和 references。
- `src/shared/types/agent-plugin.ts:202` 的 `AgentCapabilityPluginListResult` 当前只返回 `plugins`。
- `src/main/agent-plugins/registry.ts:1021` 的 `listAgentCapabilityPlugins()` 只组装 Claude Code / Codex 两个内置 plugin。
- `src/main/ipc/handlers.ts:95` 通过 `agent-plugins:list` 返回 registry 结果, renderer 不直接读文件系统。
- `src/renderer/src/hooks/use-ipc.ts:196` 的 `useAgentCapabilityPlugins()` 只接收 `plugins`、`loading`、`error`。
- `src/renderer/src/components/settings/agent-capability-plugins-section.tsx:29` 只展示可用 plugin 列表; 现在没有 manifest load status 或 validation error 的承载位置。
- `tests/unit/agent-capability-plugins.test.ts:229` 覆盖内置 plugin registry 契约。
- `tests/renderer/settings-agent-plugins.test.tsx:111` 覆盖 Settings 默认摘要、展开详情和 reference 打开行为。
- `src/main/adapters/claude-code/parsers.ts:619` 的 `parsePlugin()` 只是把 Claude Code plugin 扫描成资产, 解析 `package.json` 失败会忽略; 它不是 GH-29 需要的 registry manifest validator。

本任务不是让第三方 manifest 立即获得扫描、写入或执行能力。原因:

- manifest 作者没有本地 i18n key, 直接把第三方 plugin 放进现有 `AgentCapabilityPlugin` 详情页会产生裸 key 或空说明。
- 写入/执行权限需要更细的确认路径, 当前 UI 只展示权限, 不适合启用未知写操作。
- health engine、parser、hooks manager 仍是内置代码路径, 不能因为一个 manifest 出现就执行未知逻辑。

因此本轮应先提供“manifest 索引 + fail closed 校验 + Settings 状态展示”:

- 读取 Berth 明确约定位置的 manifest JSON。
- 校验 schemaVersion、id、displayName、version、agentCompatibility、permissions、sourceDescriptors、assetDescriptors、healthCheckDescriptors、hookSchema 的基础结构。
- 有效 manifest 进入 `manifests` 状态列表, 展示 id、版本和目标 Agent 兼容信息, 但不加入可操作 `plugins`。
- 无效 manifest 进入 `manifests` 状态列表, 展示错误摘要和路径。
- 内置 Claude Code / Codex plugin 仍按当前 registry 返回, 行为不变。

## 外部文档证据

已用英文检索官方 / primary source:

- Claude Plugins overview: https://claude.com/docs/plugins/overview
- Claude Code plugins reference: https://code.claude.com/docs/en/plugins-reference
- OpenAI Codex plugins and skills: https://openai.com/academy/codex-plugins-and-skills/

对本任务有影响的事实:

- Claude 官方说明插件源自 Claude Code, 是 versioned shareable directories, manifest `plugin.json` 定义 identity、version 和 components。
- Claude Code reference 指向 `.claude-plugin/plugin.json`; manifest 存在时 `name` 是唯一必填字段, `version` 是可选 semantic version, 未识别字段可作为 warning, 类型错误会导致 load error。
- Claude Code plugin 支持 skills、agents、hooks、MCP servers、LSP servers、monitors、themes 等 component path。
- Claude Code version management 使用 `plugin.json.version`、marketplace entry version、git commit SHA 或 unknown 作为版本来源。
- OpenAI 官方目前只公开 Codex 插件用于连接外部工具和信息源, 并能在 Codex 的 Plugins UI 中浏览或创建; 未找到与 Claude Code `.claude-plugin/plugin.json` 等价的本地 manifest schema。

结论: Berth 不能把 GH-29 的 manifest 命名为 Claude 或 Codex 官方 manifest。它应是 Berth 自己的 `Agent Capability Plugin manifest`, 可引用官方 Agent 能力信息, 但第一版只读校验和展示, 不执行未知 plugin code。

## 关联与依赖

- 主进程:
  - `src/main/agent-plugins/registry.ts` 继续负责内置 plugin。
  - 新增 manifest parser/loader 应放在 `src/main/agent-plugins/manifest.ts`, 因为它需要读本地文件系统, 不应进 renderer 或 IPC handler。
  - `src/main/ipc/handlers.ts` 可以把 scanner projectDir / homeDir 传给 loader。
- 跨进程类型:
  - `src/shared/types/agent-plugin.ts` 需要增加 manifest load status 类型, 并让 `AgentCapabilityPluginListResult` 可返回 `manifests`。
  - 不必立刻放宽 `AgentCapabilityPluginId` 和 `AgentPluginAgentId` 到任意 string; 本轮不把第三方 manifest 变成 active plugin。
- Renderer:
  - `useAgentCapabilityPlugins()` 要把 `manifests` 一起返回给 Settings。
  - Settings 可在 Agent Capability Plugins 区块内加入一个低噪声的 manifest status 区域, 默认只显示计数和简短状态, 错误路径/原因放进展开区。
- 文件发现:
  - 建议优先读取 `~/.berth/agent-plugins/*.json`。
  - 如存在 projectDir, 读取 `<project>/.berth/agent-plugins/*.json`。
  - 可加 `BERTH_AGENT_PLUGIN_MANIFESTS` 作为显式测试/高级入口, 使用平台 path delimiter 分隔。
  - 本轮不自动扫描网络目录、不下载、不执行 manifest 指定代码。

## 验收标准

1. `agent-plugins:list` 返回内置 `plugins` 的同时, 能返回 manifest load status 列表。
2. manifest parser 对基础字段、schemaVersion、id 冲突、权限 kind、scope、路径、source / asset / health / hook descriptor 基础结构做 fail closed 校验。
3. 无效 JSON、schemaVersion 不兼容、id 与内置 plugin 冲突、缺少必填字段时, 不加入 active plugins, 并返回可读错误。
4. 有效 manifest 的 id、displayName、version、target agent name / versionRange 能进入 UI 状态。
5. Settings 页面能展示 manifest load status, 默认不把错误详情铺满页面。
6. 内置 Claude Code / Codex plugin 列表、权限、来源覆盖、hook schema 和现有 tests 行为不变。
7. 不执行第三方 manifest 中的任何代码或命令, 不新增写入动作。
8. `pnpm typecheck`, 目标 unit / renderer tests, `pnpm harness:check --work docs/works/2026-06-02-gh-29-agent-plugin-manifest-version-compatibility` 通过。

## 界面质量与交互验收

现有 Settings 页面:

- Agent Capability Plugins 是 Settings 中的一个折叠列表区块。
- 默认行展示 name、version、built-in、enabled/detected、target、capability count 和 source coverage。
- 展开后展示 permissions、sources、capabilities、references。
- 当前视觉为黑白灰为主, 语义状态通过小 badge 表达。

本轮 UI 目标:

- manifest 状态必须低噪声: 放在同一插件区块内, 不新增整页说明卡。
- 有效 / 无效状态用短 badge 和一行摘要表达; 路径、错误列表进入展开区域。
- 错误态必须可读, 但不应看起来像应用崩溃。
- 长路径必须截断并保留 title。
- 空 manifest 列表不展示额外空态, 避免设置页变重。
- keyboard focus 能打开 manifest 详情。

需要补的 UI 状态:

- loading、empty、全局 IPC error 保持现状。
- 部分成功: 内置 plugins 正常展示, invalid manifest 不清空页面。
- valid third-party manifest 显示 `Manifest` / `Read-only` 这类短 badge。
- invalid manifest 默认不展示 permissions / capabilities, 展开后显示错误原因和路径。
- incompatible manifest 显示 disabled / muted 行, 并展示 target agent version range。

## 未决问题

无需向用户确认。为控制范围, 本轮不激活第三方 manifest 为可操作 plugin; 只做读取、校验和状态展示。
