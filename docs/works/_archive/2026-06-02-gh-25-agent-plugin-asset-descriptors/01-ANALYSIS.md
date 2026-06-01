# Explore: Agent Capability Plugin asset descriptors

## 现状理解

GH-24 已经让内置 Agent Capability Plugin 描述 source descriptors, 但 registry 仍不能说明“这个 Agent 能解析哪些顶层资产”。当前资产能力主要散在两个 adapter 的 parser / scanner 中:

- Claude Code: `src/main/adapters/claude-code/scanner.ts` 调用 `parsers.ts` 产出 instruction、capability、state、observability、integration 五类资产。
- Codex: `src/main/adapters/codex/index.ts` 调用 `parsers.ts` 产出 instruction、capability、state 三类资产。
- `src/shared/types/asset.ts` 的 `AssetType` 有一部分是预留或 session detail 内部概念, 当前 adapter 不会作为顶层 `Asset` 产出。

本任务应以真实 parser 输出为准, 不按联合类型补全虚假的能力。

## 当前资产输出

Claude Code 当前产出:

| category | Asset.type | scope 规律 |
|---|---|---|
| instruction | `claude-md`, `agents-md`, `skill`, `agent`, `command`, `team` | `user`, `project` |
| instruction | `output-mode` | `user` |
| capability | `mcp-server`, `hook`, `permission`, `env`, `statusline` | `user`, `project`, `enterprise` |
| capability | `plugin` | `user` |
| state | `session` | `session` |
| state | `plan`, `todo`, `history` | `user` |
| observability | `stats-cache`, `usage-data` | `user` |
| integration | `ide-lock`, `credential` | `user`; `credential` 标记 `sensitive` |

Codex 当前产出:

| category | Asset.type | scope 规律 |
|---|---|---|
| instruction | `agents-md`, `agent`, `skill` | `user`, `project` |
| capability | `mcp-server`, `hook`, `statusline` | `user`, `project` |
| state | `session` | `session`; active / archived 通过 `meta.archived` 区分 |

当前不应声明的预留类型:

- `marketplace`
- `file-history`
- `shell-snapshot`
- `statsig`
- `debug`
- `worktree`
- `backup`

## 关联与依赖

- 类型: `src/shared/types/asset.ts` 定义 `AssetType`、`AssetCategory`、`AssetScope`。
- 插件契约: `src/shared/types/agent-plugin.ts` 定义 `AgentCapabilityPlugin`。
- 主进程: `src/main/agent-plugins/registry.ts` 组装 Claude Code / Codex 内置 plugin。
- Renderer: `src/renderer/src/components/settings/agent-capability-plugins-section.tsx` 当前不展示资产 descriptor, 只要 fixture 对齐类型即可。
- 测试: `tests/unit/agent-capability-plugins.test.ts` 适合验证 descriptor 清单; `tests/renderer/settings-agent-plugins.test.tsx` 确认 Settings 不退化。

## 界面质量与交互验收

本任务新增数据能力, 不默认展示完整资产类型清单。界面验收重点:

- Settings 插件区默认摘要不增加平铺说明。
- 展开详情仍保持当前信息密度, 不因为 descriptor 增加卡片或长列表。
- 未来如展示 asset descriptors, 应放在展开详情或 hover 说明, 并区分 `Agent Capability Plugin` 和 Claude Code 本地 `plugin` asset。

## 风险

- `plugin` 命名容易混淆: `Asset.type = plugin` 是 Claude Code 本地插件, 不是 Berth 的 Agent Capability Plugin。
- `agent` 命名也有歧义: 这里指 custom agent / subagent, 不是 Claude Code / Codex 这个 Agent。
- 来源 scope 和资产 scope 不能混用: 例如 Codex sessions 来源目录是 user scope, 但产出的 session asset 是 session scope。
- Claude Code project root 的 `CLAUDE.md` / `AGENTS.md` 不是 `.claude` source descriptor 的严格子路径, asset descriptor 的 `sourceCodes` 只能作为辅助, 不能承诺一一对应。

## 验收标准

- A1: `AgentCapabilityPlugin` 暴露 `assetDescriptors`, 每项包含 `type`、`category`、`scopes`、可选 `sourceCodes` 和可选 `sensitive`。
- A2: Claude Code descriptor 覆盖当前真实产出的所有 Claude 顶层 `Asset.type`, 且不包含预留类型。
- A3: Codex descriptor 覆盖当前真实产出的所有 Codex 顶层 `Asset.type`, 且不声明目前没有产出的 `permission` / `env` / `plugin`。
- A4: Settings 插件列表继续通过 `agent-plugins:list` 渲染, 默认视图不增加资产清单噪声。
- A5: 测试能发现 descriptor 与当前 adapter 资产输出面脱节。

## 未决问题

无需要用户澄清的问题。采用保守方案: 本任务只把 asset descriptors 纳入 registry, 不迁移 parser 执行逻辑, 不新增 UI 展示。
