# 需求分析 (Explore 产物)

## 现状理解

首页健康检查当前链路:

1. Renderer: `src/renderer/src/pages/overview.tsx` 调 `useHealthChecks()`。
2. Preload/IPC: `assets:health-check` 暴露到 renderer。
3. Main: `src/main/ipc/handlers.ts` 调 `runHealthChecks()`。
4. Engine: `src/main/engine/health.ts` 直接读 `os.homedir()` 下的 `~/.claude` / `~/.codex`。

当前检查项很少:

- `~/.claude` 和 `~/.codex` 都不存在时返回 warning。
- Codex-only 时不报 Claude 缺失。
- Claude 存在时检查 `~/.claude/CLAUDE.md` 是否存在、`~/.claude/settings.json` JSON 是否有效、`~/.claude/projects` 下是否有空目录。

当前 UI 还会把 `info` 丢掉:

- `overview.tsx` 只展示 `warning` / `error`。
- 因此 `no-user-claude-md`、`empty-project-dirs` 这类 info 不会出现在首页。

当前 `HealthCheck` 契约不够:

- 只有 `id / severity / message / assetId / assetType`。
- 没有 agent、scope、path、category、建议动作、是否可点击、检查来源等字段。
- 这会限制首页做分组、跳转和解释。

当前 scanner 能复用一部分:

- `AssetScanner` 已统一聚合 Claude Code 和 Codex adapter。
- Claude adapter 已扫描 `CLAUDE.md` / `AGENTS.md`、skills、commands、MCP、hooks、permissions、env、plugins、sessions 等。
- Codex adapter 当前只扫描 `~/.codex/sessions`，还没有扫描 `~/.codex/config.toml`、`hooks.json`、`~/.codex/agents`、`$HOME/.agents/skills`、repo `.agents/skills` 等。
- Claude subagent 扫描仍按 `**/*.{yml,yaml}`，但官方文档说 Claude Code subagents 是带 YAML frontmatter 的 Markdown 文件，应纳入本轮修正。

官方文档证据:

- Codex 配置: user-level config 在 `~/.codex/config.toml`，project override 在 `.codex/config.toml`; `CODEX_HOME` 可改变 Codex home。配置中包含 `mcp_servers.*`、`hooks.*`、`skills.config`、`agents.*` 等字段。来源: https://developers.openai.com/codex/config-reference#configtoml
- Codex sessions: Codex 本地 transcript 位于 `~/.codex/sessions/`; Windows app 使用 `%USERPROFILE%\.codex`，WSL 默认是 Linux home，可通过 `CODEX_HOME` 指向 Windows home。来源: https://developers.openai.com/codex/cli/features#resuming-conversations 与 https://developers.openai.com/codex/app/windows#share-config-auth-and-sessions-with-wsl
- Codex instructions / skills / agents: Codex 支持 `~/.codex/AGENTS.md`、repo `AGENTS.md`; skills 在 `$HOME/.agents/skills` 或 repo `.agents/skills`; custom agents 在 `~/.codex/agents/` 或 repo `.codex/agents/`，必须包含 `name / description / developer_instructions`。来源: https://developers.openai.com/codex/guides/agents-md#customize-fallback-filenames, https://developers.openai.com/codex/concepts/customization#skills, https://developers.openai.com/codex/subagents#custom-agents
- Codex hooks: hooks 从 `~/.codex/hooks.json`、`~/.codex/config.toml`、`<repo>/.codex/hooks.json`、`<repo>/.codex/config.toml` 发现；同一层同时有 `hooks.json` 和 inline `[hooks]` 会合并并在启动时警告。来源: https://developers.openai.com/codex/hooks#where-codex-looks-for-hooks
- Claude Code 设置: `settings.json` 是官方配置机制；user 为 `~/.claude/settings.json`，project 为 `.claude/settings.json` 和 `.claude/settings.local.json`; settings 管 permissions、env、tool behavior。来源: https://code.claude.com/docs/en/settings
- Claude Code memory: Claude Code 读取 `CLAUDE.md`，不是 `AGENTS.md`; 若 repo 用 `AGENTS.md`，建议 `CLAUDE.md` import 它；`@path` import 支持相对/绝对路径，最多 4 层。来源: https://code.claude.com/docs/en/memory
- Claude Code skills: skills 是 `SKILL.md` 目录，user 在 `~/.claude/skills/`，project 在 `.claude/skills/`; `.claude/commands/*.md` 仍可用，但 custom commands 已并入 skills。来源: https://code.claude.com/docs/en/slash-commands
- Claude Code hooks: hooks 可定义在 settings、plugins、skills、subagents；支持 `command/http/mcp_tool/prompt/agent` 类型，Windows 可用 `"shell": "powershell"`。来源: https://code.claude.com/docs/en/hooks
- Claude Code MCP: MCP scopes 包含 local/project/user，project 配置存储在 `.mcp.json`，user/local 存在 `~/.claude.json`；`.mcp.json` 支持环境变量展开。来源: https://code.claude.com/docs/en/mcp
- Claude Code subagents: user subagents 在 `~/.claude/agents/`，project subagents 在 `.claude/agents/`，定义为 Markdown + YAML frontmatter。来源: https://code.claude.com/docs/en/sub-agents

## 关联与依赖

模块边界:

- 主进程负责所有文件系统读取和解析；renderer 不直接读本地文件。
- `HealthCheck` 应继续是只读诊断，不执行 agent CLI，不修改用户配置。
- 健康检查应复用 scanner 现有资产与错误，避免同一份文件被两套逻辑解释出不同结果。
- 对 Codex TOML 需要结构化 parser，不能靠字符串判断配置是否有效。
- 对 Claude Code JSON/YAML/Markdown frontmatter 可复用现有 `js-yaml` 与 JSON parser。

跨平台边界:

- Node `os.homedir()` 在 macOS/Windows 都可得到用户 home；路径展示交给现有 UI 格式化。
- Windows 下 Codex 原生 home 是 `%USERPROFILE%\.codex`，等价于 `path.join(os.homedir(), '.codex')`。
- WSL 的 Codex home 与 Windows app home 不自动共享，本轮只扫描当前 Berth 进程所在 OS 的 home，不跨 WSL 文件系统主动猜测。
- 不执行 `/doctor`、`/status`、`/mcp` 等交互命令，避免破坏只读边界和阻塞 UI。

检查项分层:

1. Source: agent home / session dir / project config 是否存在、是否可读。
2. Syntax: JSON / TOML / YAML frontmatter / Markdown frontmatter 是否可解析。
3. Structure: 官方要求的必填字段是否存在，例如 Codex custom agent 的 `name / description / developer_instructions`、skill `SKILL.md`。
4. References: `CLAUDE.md` / `AGENTS.md` 的 `@path` import、MCP command cwd、hook command path 等是否指向可读目标。涉及 shell 命令的复杂解析只做保守检查。
5. Configuration risk: bypass / broad permissions、缺少 Windows hook shell override、同一 Codex layer 同时存在 `hooks.json` 和 inline `[hooks]` 等。
6. Freshness: session 目录存在但无 transcript、最近 session 解析不到 project/time/token 等。

既有文档问题:

- `docs/user-manual.md` 的 Health Checks 写了 MCP failed、skill broken import、configuration issues，但代码没有完整实现。实现后要同步文档，避免文档继续超前或偏离。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. 首页健康检查展示所有 severity，包括 info/warning/error，不再丢弃 info。
2. 健康检查结果包含 agent、category、scope、path、message、suggestion，能按 agent 分组展示。
3. Claude Code 支持 macOS/Windows 下的 user/project 配置检查: `~/.claude/settings.json`、`.claude/settings.json`、`.claude/settings.local.json`、`~/.claude/CLAUDE.md`、project `CLAUDE.md` / `.claude/CLAUDE.md`、`.mcp.json`、`~/.claude.json`。
4. Claude Code skills、commands、subagents、hooks、MCP、permissions、env 的基础结构与语法错误能被报告。
5. Claude Code subagent Markdown frontmatter 被健康检查支持；scanner 不应继续只支持 yml/yaml。
6. Codex 支持 macOS/Windows 下的 user/project 配置检查: `~/.codex/config.toml`、`~/.codex/hooks.json`、`~/.codex/AGENTS.md`、`~/.codex/agents/*.toml`、`~/.codex/sessions`、repo `.codex/config.toml`、repo `.codex/hooks.json`、repo `AGENTS.md`。
7. Codex skills 检查覆盖 `$HOME/.agents/skills/*/SKILL.md` 和 repo `.agents/skills/*/SKILL.md`。
8. Codex TOML 用结构化 parser 校验，能识别 invalid TOML，不用 ad hoc 字符串解析。
9. `@path` import 检查对 Claude `CLAUDE.md` 和 Codex `AGENTS.md` 都生效，缺失目标给出 warning。
10. session 健康检查能指出 agent 数据存在但无 session、session 文件不可读、最近 session 缺少关键 metadata 等问题。
11. 健康检查仍保持只读，不运行外部 agent CLI，不读取 credential 内容。
12. 单元测试覆盖 Claude-only、Codex-only、both、missing、Windows path、invalid JSON/TOML、missing imports、invalid subagent/skill/hook/MCP 配置。
13. Renderer 测试覆盖首页健康检查列表、分组、info 展示、点击 path/asset 行为。
14. 文档同步更新，真实说明健康检查能做什么、不能做什么。
15. 验证至少包括相关单测、renderer 测试、`pnpm typecheck`、`pnpm harness:check`；最终阶段再跑 lint/build。

## 未决问题
留给 design 向人澄清。

无阻塞性未决问题。本轮按只读本地诊断实现，不运行 `codex` / `claude` CLI，不跨 WSL 主动扫描另一套 home，不修复用户配置文件。
