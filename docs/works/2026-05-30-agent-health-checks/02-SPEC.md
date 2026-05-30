# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

`HealthCheck` 保持扁平数组返回, renderer 负责分组和排序。IPC 继续使用 `assets:health-check`, 但 handler 可异步执行, 以便复用 scanner 的 assets 与 errors。

```ts
export type HealthCheckSeverity = 'info' | 'warning' | 'error'
export type HealthCheckCategory =
  | 'source'
  | 'syntax'
  | 'structure'
  | 'reference'
  | 'configuration'
  | 'session'

export interface HealthCheck {
  id: string
  severity: HealthCheckSeverity
  category: HealthCheckCategory
  agentId: 'all' | 'claude-code' | 'codex'
  agentName: string
  title: string
  message: string
  suggestion?: string
  scope?: AssetScope
  path?: string
  assetId?: string
  assetType?: string
}
```

字段约定:

- `id`: 稳定可测试 ID, 使用 `{agent}:{category}:{scope}:{slug}` 或带 path hash 的格式。
- `category`: 用于 UI 分组、测试断言和后续筛选。
- `agentId/agentName`: 首页按 Claude Code / Codex 分组展示。
- `title/message/suggestion`: `title` 是短标题, `message` 是事实说明, `suggestion` 是可执行建议。
- `path`: 可点击时调用 `shell.openPath(path)`; 不把文件内容或 credential 暴露给 renderer。
- `assetId/assetType`: 兼容现有跳转能力。没有资产 ID 时只展示 path。

`runHealthChecks` 改为接收 options, 测试可注入 home/project/platform/env:

```ts
interface HealthCheckOptions {
  homeDir?: string
  projectDir?: string
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  assets?: Asset[]
  scanErrors?: ScanError[]
}
```

Codex home 解析顺序为 `options.env.CODEX_HOME` → `process.env.CODEX_HOME` → `{homeDir}/.codex`。Claude Code 使用 `{homeDir}/.claude`; Windows 下 `~/.claude` 视为 `%USERPROFILE%\.claude`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

主进程:

- `src/main/engine/health.ts`
  - 只读检查入口。
  - 负责路径发现、语法解析、结构验证、引用检查、session 检查和 scanner error 转换。
  - 使用 `JSON.parse`、`js-yaml` 和 TOML parser 做结构化解析。
- `src/main/adapters/codex/parsers.ts`
  - 增加 Codex TOML config/custom agent 解析函数。
  - 保留 session parser。
- `src/main/adapters/codex/index.ts`
  - 扫描 Codex instructions、skills、agents、MCP、hooks 与 sessions。
  - user scope: `~/.codex/config.toml`, `~/.codex/hooks.json`, `~/.codex/AGENTS.md`, `~/.codex/agents/*.toml`, `$HOME/.agents/skills/*/SKILL.md`, `~/.codex/sessions`.
  - project scope: `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, `.codex/agents/*.toml`, `.agents/skills/*/SKILL.md`。
- `src/main/adapters/claude-code/scanner.ts`
  - Claude subagent 扫描从 `**/*.{yml,yaml}` 改为 Markdown frontmatter 文件, 兼容旧 yml/yaml 不作为本轮必要目标。
- `src/main/adapters/claude-code/parsers.ts`
  - `parseAgent` 支持 Markdown + YAML frontmatter, 并对旧 YAML 文件保持兼容。
- `src/main/ipc/handlers.ts`
  - `assets:health-check` 先确保 scanner 至少扫描一次, 再把 assets/errors/projectDir 传给 health engine。

前端:

- `src/shared/types/ipc.ts`
  - 扩展 `HealthCheck` 类型。
- `src/renderer/src/pages/overview.tsx`
  - 不再过滤掉 `info`。
  - 按 agent 分组, 每组展示 error/warning/info 数量。
  - 每条展示 severity 图标、title、message、suggestion、scope/path。
  - `path` 存在时点击打开 path; `assetId` 存在时保留配置页跳转。

文档:

- `docs/user-manual.md`
  - 更新 Health Checks 的真实能力边界: 只读、本机、当前 OS home、当前 projectDir; 不运行 `claude` / `codex` CLI; 不跨 WSL 主动扫描另一套 home。

检查范围:

- Claude Code
  - source: `~/.claude`, `~/.claude/projects`, project `.claude`。
  - syntax: `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, `~/.claude.json`, `.mcp.json`, subagent frontmatter, skill frontmatter。
  - structure: skill 必须是 `SKILL.md`; subagent frontmatter 至少有 `name` / `description`; MCP server 至少有 command/url/type 之一; hook handler 有合法结构。
  - reference: `CLAUDE.md` 和 `AGENTS.md` 的 `@path` import 必须能解析到文件。
  - configuration: 宽权限、bypass permission、Windows command hook 缺少 PowerShell/shell hint 只报 warning。
  - session: session 目录存在但为空、jsonl 不可读、最近 session 缺少时间或项目路径。
- Codex
  - source: `~/.codex`, `$CODEX_HOME`, `~/.codex/sessions`, project `.codex`, repo `AGENTS.md`, repo `.agents/skills`。
  - syntax: TOML config/custom agent, hooks JSON, `AGENTS.md` imports。
  - structure: custom agent 必须有 `name` / `description` / `developer_instructions`; skill 必须有 `SKILL.md`; hook handler 当前只把 command hook 当作可执行项。
  - reference: `AGENTS.md` 的 `@path` import、Codex custom agent `skills.config[].path`、MCP command cwd 等保守检查。
  - configuration: 同一层同时有 `hooks.json` 和 inline `[hooks]` 时 warning; Windows 下 command hook 没有 `commandWindows` / `command_windows` 时 warning。
  - session: `~/.codex/sessions` 存在但无 `rollout-*.jsonl`、session 解析不到 id/time/project/token 时 info 或 warning。

TOML parser:

- 增加轻量依赖 `smol-toml` 或等价结构化 parser。
- 不能用正则判断 TOML 是否有效。

## 测试策略

- 单元测试优先覆盖 `runHealthChecks`, 用临时目录模拟 macOS/Windows 路径和 `CODEX_HOME`。
- Codex adapter 测试覆盖 config/hook/agent/skill/session scan roots 和 invalid TOML。
- Claude scanner 测试覆盖 Markdown frontmatter subagent。
- Renderer 测试覆盖 Overview 展示 info/warning/error、agent 分组、path 点击。
- 每个 implementation 增量的最低检查:
  - health/parser 增量: 对应 unit test。
  - renderer 增量: 对应 renderer test。
  - 文档/任务态增量: `pnpm harness:check`。
- 最终 verify:
  - `pnpm test -- tests/unit/health-check.test.ts tests/unit/codex-adapter.test.ts tests/unit/claude-scanner.test.ts`
  - `pnpm test -- tests/renderer/overview-health-checks.test.tsx`
  - `pnpm typecheck`
  - `pnpm harness:check`
  - `pnpm lint`
  - `pnpm build`

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| HealthCheck 扩展契约与 Overview 展示 | 1, 2, 13 |
| Claude Code user/project 配置、skills、commands、subagents、hooks、MCP、permissions、env 检查 | 3, 4, 5 |
| Codex config/hooks/agents/skills/sessions/project instructions 检查 | 6, 7, 8 |
| `@path` import 与保守引用检查 | 9 |
| session 目录和 transcript 质量检查 | 10 |
| 只读边界与 credential 隔离 | 11 |
| 单元、renderer、typecheck、harness、lint、build | 12, 13, 15 |
| user manual 同步 | 14 |
