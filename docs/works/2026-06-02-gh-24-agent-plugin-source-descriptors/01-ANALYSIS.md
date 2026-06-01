# Explore: Agent Capability Plugin source descriptors

## 现状理解

GH-12 已经新增 `src/main/agent-plugins/registry.ts`, 由 `agent-plugins:list` IPC 暴露 Claude Code / Codex 两个内置 Agent Capability Plugin。设置页读取这个列表展示能力、权限、检测状态和当前来源覆盖。

现在的来源覆盖来自真实扫描链路:

1. `src/main/engine/scanner.ts` 调用每个 adapter 的 `detect()` 与 `scanSourceCoverage()`。
2. adapter 返回已知来源里当前能判断到的 `ScanRoot[]`。
3. scanner 用 `withProjectSourceCandidates()` 追加 `project.current-candidate` / `project.session-derived-candidate` 这类通用项目候选来源。
4. plugin registry 只把 `AgentScanSourceGroup.sources` 映射成 `sourceCoverage`, 自身没有声明“这个插件理论上支持哪些来源”。

这导致 Settings 可以展示当前状态, 但 registry 不能作为更广义的 Agent 能力描述使用。后续要支持第三方 Agent 或生成新插件时, 需要一个稳定的 source descriptor 清单。

## 当前来源清单

Claude Code adapter 当前输出:

| code | scope | kind | categories |
|---|---|---|---|
| `claude.user.data-directory` | `user` | `directory` | `instruction`, `capability`, `state`, `observability`, `integration` |
| `claude.user.global-config` | `user` | `file` | `capability` |
| `claude.project.directory` | `project` | `directory` | `instruction`, `capability` |
| `claude.project.mcp-config` | `project` | `file` | `capability` |
| `claude.enterprise.managed-settings` | `enterprise` | `file` | `capability` |
| `claude.enterprise.managed-mcp` | `enterprise` | `file` | `capability` |

Codex adapter 当前输出:

| code | scope | kind | categories |
|---|---|---|---|
| `codex.user.config` | `user` | `file` | `capability` |
| `codex.user.hooks` | `user` | `file` | `capability` |
| `codex.user.agents-md` | `user` | `file` | `instruction` |
| `codex.user.agents-directory` | `user` | `directory` | `instruction` |
| `codex.user.codex-home-skills` | `user` | `directory` | `instruction` |
| `codex.user.sessions` | `user` | `directory` | `state` |
| `codex.session.archived-sessions` | `session` | `directory` | `state` |
| `codex.user.shared-skills` | `user` | `directory` | `instruction` |
| `codex.project.agents-md` | `project` | `file` | `instruction` |
| `codex.project.config` | `project` | `file` | `capability` |
| `codex.project.hooks` | `project` | `file` | `capability` |
| `codex.project.agents-directory` | `project` | `directory` | `instruction` |
| `codex.project.skills` | `project` | `directory` | `instruction` |

`project.current-candidate` 和 `project.session-derived-candidate` 不是某个 adapter 的来源能力, 而是 scanner 为当前项目和会话历史追加的通用候选路径。它们应该能进入运行时 coverage, 但不应被算作某个 Agent 插件声明的专属 descriptor。

## 关联与依赖

- 类型: `src/shared/types/asset.ts` 定义 `ScanSourceCode`、`ScanSourceKind`、`ScanRoot`。
- 插件契约: `src/shared/types/agent-plugin.ts` 定义 `AgentCapabilityPlugin` 和 `sourceCoverage`。
- 主进程: `src/main/agent-plugins/registry.ts` 组装内置 plugin。
- scanner: `src/main/engine/scanner.ts` 负责运行时来源状态, 本任务不迁移 scanner 行为。
- UI: `src/renderer/src/components/settings/agent-capability-plugins-section.tsx` 继续读取 plugin list。此任务不是视觉改版, 但 UI 不能因为新增字段而退化。

## 界面质量与交互验收

本任务主要改变数据契约, Settings 展示路径保持原样。界面验收重点是:

- 插件列表仍默认只展示概要, 不展开权限、能力和来源细节。
- 展开后现有来源状态摘要仍能显示扫描、未发现、未扫描计数。
- 新增 descriptor 不应把完整理论来源清单平铺到默认视图, 避免增加噪声。
- 若后续 UI 使用 descriptor, 应优先放在展开详情或 hover 说明里。

## 验收标准

- A1: `AgentCapabilityPlugin` 暴露 source descriptors, 每项包含 `code`、`scope`、`kind`、`categories` 和可读路径模板。
- A2: Claude Code / Codex 内置插件的 descriptor 覆盖当前 adapter 自身输出的所有 agent-specific `ScanSourceCode`。
- A3: 运行时 `sourceCoverage.sources` 能通过 `code` 与 descriptor 对齐, 并保留 scanner 追加的 `project.*` 通用来源。
- A4: Settings 仍能通过 `agent-plugins:list` 渲染来源覆盖概要与展开详情。
- A5: 测试能发现 registry descriptor 与当前 adapter 来源 code 脱节的问题。

## 未决问题

无需要用户澄清的问题。采用保守方案: 本任务只让 plugin registry 声明来源能力, 不把 adapter 改成从 descriptor 生成 scan roots。
