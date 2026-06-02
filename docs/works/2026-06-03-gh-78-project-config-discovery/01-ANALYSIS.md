# 需求分析 (Explore 产物)

## 现状理解
- 入口链路: renderer Project Scope Switcher -> `project-scope:activate` IPC -> `activateProjectScope()` -> `initScanner(projectDir)` -> `AssetScanner` -> `ClaudeCodeAdapter(projectDir)` / `CodexAdapter(projectDir)` -> `scanAll()` -> search index rebuild。
- Claude Code 当前已扫:
  - 用户级: `~/.claude/CLAUDE.md`, `~/.claude/AGENTS.md`, `~/.claude/skills`, `~/.claude/agents`, `~/.claude/settings.json`, `~/.claude.json`。
  - 项目级: 仅检查 `projectDir/CLAUDE.md`, `projectDir/AGENTS.md`, `projectDir/.claude/CLAUDE.md`, `projectDir/.claude/AGENTS.md`, `projectDir/.claude/skills`, `projectDir/.claude/agents`, `projectDir/.claude/commands`, `projectDir/.claude/teams`, `projectDir/.claude/settings.json`, `projectDir/.claude/settings.local.json`, `projectDir/.mcp.json`。
- Codex 当前已扫:
  - 用户级: `~/.codex/config.toml`, `~/.codex/hooks.json`, `~/.codex/AGENTS.md`, `~/.codex/agents`, `~/.codex/skills`, `~/.agents/skills`, sessions。
  - 项目级: 仅检查 `projectDir/AGENTS.md`, `projectDir/.codex/config.toml`, `projectDir/.codex/hooks.json`, `projectDir/.codex/agents`, `projectDir/.agents/skills`。
- 已有 `project-scope` 基础设施能在切换项目后重建 scanner / watcher / search index, 但传入的 `projectDir` 可能是会话 cwd。若 cwd 位于仓库子目录, 现有 adapter 只扫该子目录, 不会上溯到仓库根或父级目录。

## 官方契约 / primary source
- Claude Code memory 文档说明 `CLAUDE.md` 会从当前工作目录向上递归读取, 同时也支持子目录局部说明: https://docs.claude.com/en/docs/claude-code/memory
- Claude Code settings 文档说明项目设置位于 `.claude/settings.json`, 本地项目设置位于 `.claude/settings.local.json`, MCP 可来自项目 `.mcp.json`: https://docs.claude.com/en/docs/claude-code/settings
- Claude Code subagents 文档说明项目 subagents 位于 `.claude/agents`: https://docs.claude.com/en/docs/claude-code/sub-agents
- Claude Code skills 文档说明项目 skills 位于 `.claude/skills`: https://docs.claude.com/en/docs/claude-code/skills
- Codex config 文档说明项目配置文件位于 `.codex/config.toml`, Codex 会从项目根到当前工作目录合并 `AGENTS.md`, 并且项目配置中的 hooks/MCP 与用户配置不同源: https://developers.openai.com/codex/config
- Codex skills 文档说明项目 skills 位于 `.agents/skills`: https://developers.openai.com/codex/skills
- Codex subagents 文档说明项目 subagents 位于 `.codex/agents`: https://developers.openai.com/codex/subagents

## 缺口
- 项目级扫描只使用单一 `projectDir`, 没有构造 “项目配置层级 roots”。典型复现: 会话 cwd 是 `D:\Code\berth\src\renderer`, 实际配置在 `D:\Code\berth\AGENTS.md` / `.agents/skills` / `.codex/config.toml`; 现有 Codex adapter 会漏扫。
- `scanSourceCoverage()` 也只报告单一项目目录, UI 不能解释“这个项目继承了哪些上级配置”。
- watcher 虽已监听当前 `projectDir` 下若干项目路径, 但未覆盖父级项目配置路径; 父级 `AGENTS.md` 或 `.agents/skills` 修改后可能不会触发重扫。
- 当前测试只覆盖 `projectDir` 根目录存在项目资产的情况, 没有覆盖“会话 cwd 在子目录、配置在父级/仓库根”的场景。

## 关联与依赖
- `src/shared/types/asset.ts` 需要扩展 `ScanSourceCode` 时会影响 agent plugin descriptor 测试。
- `src/main/adapters/claude-code/index.ts`、`scanner.ts` 和 `src/main/adapters/codex/index.ts` 是主要变更点。
- `src/main/engine/watcher.ts` 需要复用同一套 project roots, 否则扫描能读到但修改不会刷新。
- `tests/e2e/project-scope.e2e.ts` 已能验证项目 scope 切换后 search index 是否包含项目 skill, 可扩展为子目录 cwd fixture。

## 任务分类与 debt 校准
- type: bug。
- source.kind: docs-issues。
- debt estimate: 保持 `incurred=5, net=5`。影响范围跨 main scanner、watcher、search index 和 renderer 可见资产, 初估仍合理。
- scope / risk / areas / confidence: `cross-process` / `high` / `architecture,testability` / `medium` 保持不变。
- revision: 无。

## 验收标准
1. 当 project scope 指向仓库子目录时, Claude Code 扫描能发现父级/仓库根的 `CLAUDE.md`, `.claude/settings.json`, `.claude/skills`, `.claude/agents`, `.mcp.json`。
2. 当 project scope 指向仓库子目录时, Codex 扫描能发现父级/仓库根的 `AGENTS.md`, `.codex/config.toml`, `.codex/hooks.json`, `.codex/agents`, `.agents/skills`。
3. scan source coverage 能展示项目配置来源来自具体父级路径, 而不是只显示一个笼统的 current candidate。
4. watcher 使用同一套项目配置 roots, 父级项目配置变化能触发重扫。
5. Search index 在切换到子目录 project scope 后能找到父级项目 skills/subagents/MCP/hooks。
6. 不破坏现有 global/user scope 行为; 离开 project scope 后不继续沿用上一项目 roots。
7. 自动化测试覆盖 Claude、Codex、project scope runtime 或 e2e 中至少一个完整的“子目录 cwd -> 父级项目配置”路径。

## 界面质量与交互验收
- 这次主要是数据发现修复, 不新建页面。
- 用户可见影响在 Project Scope Switcher、Instructions、Capabilities、Hooks、Search 和 Overview 的资产统计。
- 需要保留现有黑白工具壳和紧凑信息密度, 不新增解释性大卡片。
- `scanSourceCoverage` 的来源列表要能让 UI 继续显示路径、scope、状态和来源类型; 长路径仍由现有组件截断。
- loading / error 行为不变: 切换 project scope 时仍先执行 `activateProjectScope`, 成功后更新 assets / stats / candidates。

## 未决问题
- 无需向用户澄清。实现时采用保守规则: 从当前 cwd 向上寻找配置层级, 在最近的 `.git` 根处停止; 若没有 `.git`, 最多使用当前目录和实际存在配置的父级目录, 避免扫描整个磁盘。
