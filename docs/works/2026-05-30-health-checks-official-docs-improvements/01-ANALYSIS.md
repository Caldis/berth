# 需求分析 (Explore 产物)

## 现状理解

当前健康检查已完成第一版:

1. `src/main/engine/health.ts` 负责本机只读诊断。
2. `src/main/ipc/handlers.ts` 的 `assets:health-check` 会先 `ensureScanned()`, 再把 scanner assets/errors 传给 `runHealthChecks()`。
3. `src/shared/types/ipc.ts` 的 `HealthCheck` 已有 `agentId/category/scope/path/assetId/suggestion`。
4. `src/renderer/src/pages/overview.tsx` 已按 agent 分组展示 info/warning/error, 但点击逻辑仍是 `path -> openPath`, `assetId -> /configuration/capabilities`。
5. 现有检查多为语法、结构和少量风险规则, 尚未给每条检查附官方证据、修复模板、目标路由或置信边界。

Codex 官方文档事实:

- `config.toml` 用户级配置在 `~/.codex/config.toml`, 项目级覆盖在 `<repo>/.codex/config.toml`; 官方提供 schema `https://developers.openai.com/codex/config-schema.json`。来源: https://developers.openai.com/codex/config-reference
- 项目级 `.codex/config.toml` 不能覆盖 provider/auth/profile/notify/otel 等机器本地或敏感配置, 官方会忽略这些 key。来源: https://developers.openai.com/codex/config-reference
- hooks 可来自 `~/.codex/hooks.json`, `~/.codex/config.toml`, `<repo>/.codex/hooks.json`, `<repo>/.codex/config.toml`; 多来源合并运行, 同一层同时有 hooks.json 和 inline hooks 会合并并警告。来源: https://developers.openai.com/codex/hooks
- Codex hook handler 当前只有 `type = "command"` 真正运行; `commandWindows` / `command_windows` 是 Windows override; `timeout` 单位为秒。来源: https://developers.openai.com/codex/hooks
- Codex skills 是目录, 必须包含 `SKILL.md`, 且 `SKILL.md` 必须有 `name` 和 `description`; 搜索位置包括 repo `.agents/skills`, user `$HOME/.agents/skills`, admin `/etc/codex/skills`。来源: https://developers.openai.com/codex/skills
- Codex custom agents 是独立 TOML 文件, 位于 `~/.codex/agents/` 或 repo `.codex/agents/`, 必填 `name`, `description`, `developer_instructions`。来源: https://developers.openai.com/codex/subagents
- `AGENTS.md` 读取会优先 `AGENTS.override.md`; fallback 文件只有配置在 `project_doc_fallback_filenames` 后才会被发现。来源: https://developers.openai.com/codex/guides/agents-md
- Windows app/native Codex 用 `%USERPROFILE%\.codex`; WSL CLI 默认用 Linux home `~/.codex`, 不自动共享。可在 WSL 设置 `CODEX_HOME=/mnt/c/Users/<user>/.codex`。来源: https://developers.openai.com/codex/app/windows#share-config-auth-and-sessions-with-wsl

Claude Code 官方文档事实:

- `settings.json` 是官方配置机制, user 为 `~/.claude/settings.json`, project 为 `.claude/settings.json`, local 为 `.claude/settings.local.json`; 官方示例支持 `$schema: "https://json.schemastore.org/claude-code-settings.json"`, 但 schema 可能滞后。来源: https://code.claude.com/docs/en/settings
- Claude hooks shape 是 `EventName -> matcher entries -> hooks handlers`; command hook 支持 `command`, `args`, `async`, `asyncRewake`, `shell`; `shell` 只接受 `bash` 或 `powershell`, 且 `args` 存在时 `shell` 会被忽略。来源: https://code.claude.com/docs/en/hooks
- Claude MCP local/user 存在 `~/.claude.json`, project 存在 `.mcp.json`; `.mcp.json` 支持 `${VAR}` 和 `${VAR:-default}` 展开, 缺少必需环境变量且无默认值会导致配置解析失败。来源: https://code.claude.com/docs/en/mcp
- Claude skills 推荐位置是 `.claude/skills/<name>/SKILL.md` 或 `~/.claude/skills/<name>/SKILL.md`; `SKILL.md` frontmatter 字段可选, 官方只建议写 `description`, 不应把缺 name/description 判为错误。来源: https://code.claude.com/docs/en/skills
- Claude subagent 是 Markdown + YAML frontmatter, `name` 和 `description` 必填; 多个枚举字段可校验。来源: https://code.claude.com/docs/en/sub-agents
- Claude Code 读取 `CLAUDE.md`, 不直接读取 `AGENTS.md`; 如项目已有 `AGENTS.md`, 官方建议用 `CLAUDE.md` import 它; `@path` import 最多递归 4 层。来源: https://code.claude.com/docs/en/memory
- session transcript 在 `~/.claude/projects/<project>/<session-id>.jsonl`, prompt history 在 `~/.claude/history.jsonl`, 二者为本地明文文件。来源: https://code.claude.com/docs/en/sessions 与 https://code.claude.com/docs/en/claude-directory

## 关联与依赖

直接可落地且冲突较小:

- 扩展 `HealthCheck` 数据模型: 增加 `evidence`, `fix`, `target`, `confidence`。
- 给现有检查补官方证据链接与只读修复建议模板。
- 修正高误报规则:
  - Claude skill 缺 `SKILL.md` 仍可 warning, 但 `SKILL.md` 缺 name/description 不应判错误。
  - Claude Windows hook 不应“一有 command 就 warning”; 只对 PowerShell 语法但缺 `shell: "powershell"` 的命令提示。
  - Claude hook `args` 与 `shell` 同时存在时提示 shell 会被忽略。
  - Codex project config 中官方会忽略的本地敏感 key 应提示 warning, 不判语法错误。
  - Codex hook handler 非 `command` 时提示当前会被解析但跳过, 不判结构错误。
  - MCP 同名 scope 是 precedence 行为, 不判冲突。
- Overview 使用 `target.route` 跳转, 没有 target 时再 fallback 到 path。

需要等待其他任务稳定:

- `settings-scan-directories` 当前正在改 `ScanRoot`、settings 页面、Claude/Codex adapter 来源展示。额外 home/WSL 配置会碰同一层, 本轮不直接实现任意目录输入。
- 增量刷新会改 scanner/watcher/IPC/store, 影响面大, 适合作为下一阶段单独落地。

当前工作区问题:

- 全局 `pnpm harness:check` 失败, 原因是无关未跟踪任务 `docs/works/2026-05-30-memory-source-adapter-layer/` 缺 `00-PRD.md`。本任务不修改该目录。
- 因此本轮提交若涉及 `docs/works` 产物, 会被全局 harness 阻塞; 代码增量仍可通过对应单测/typecheck 验证, 但提交前需再次确认 harness 是否恢复。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。

1. `HealthCheck` 支持官方证据链接、只读修复模板、目标路由和置信度字段, 并保持向后兼容。
2. 现有 Claude/Codex 健康检查至少覆盖一条官方 evidence, UI 能展示 evidence。
3. Overview 点击健康检查时优先使用 `target.route`, 其次 path, 最后 asset fallback。
4. Codex config 检查能提示 schema URL 和项目级 ignored keys。
5. Codex hooks 检查区分 command 可运行、prompt/agent 当前跳过、同层双表示合并警告、Windows command override。
6. Codex skills/custom agents 检查按官方必填字段执行, 并给只读修复建议。
7. Claude settings/hooks/MCP/subagent/CLAUDE.md 检查按官方规则减少误报。
8. Claude skills 不把 frontmatter 缺 name/description 判成错误; 只把缺 `SKILL.md` 和 frontmatter 解析失败作为提示。
9. WSL/Windows 双 home 和额外 home 支持进入设计与后续任务清单, 但本阶段不和 settings scan directories 的脏改动冲突。
10. 增量刷新进入设计与后续任务清单, 本阶段不改 watcher/store。
11. 单元测试覆盖 evidence/fix/target、误报修正和官方规则; renderer 测试覆盖 evidence 展示与 target 跳转。
12. 验证包括相关单测、renderer 测试、typecheck; 若全局 harness 因无关任务失败, 在最终说明具体阻塞。

## 未决问题
留给 design 向人澄清。

无阻塞性产品问题。本轮先落地不依赖 settings scan directories 的增强: evidence/fix/target 和误报修正。额外 home 与增量刷新按设计拆到后续阶段。
