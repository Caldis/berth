# 参考: 多工具命令/skill 分发事实

为 Claude Code + Codex 双工具分发斜杠命令/skill 的已核实事实 (2026-05-29, 官方一手来源)。
harness 的分发架构 (见 .agents/README.md) 依据本文档, 改动分发逻辑前先复核此处。

- **Claude Code 命令桩使用扁平命名**: `.claude/commands/opsx-<verb>.md` 暴露为 `/opsx-<verb>`。
  不依赖子目录是否渲染成冒号命名空间, 避免在不支持命名空间的版本中退化为 `/new` 这类泛名命令。
- **Claude Code `.claude/commands/` 不跟随符号链接** (GitHub issue 39475/10573); `.claude/skills/`
  可用软链, 但 Windows checkout 可能把 Git symlink 落成普通文本文件。故 `.claude/skills` 允许软链或目录副本, command 桩复制。
- **Codex custom prompts 已废弃并在 HEAD 删除** (openai/codex commit 48144a7), 仅曾支持全局
  `~/.codex/prompts/` (无项目级)。替代: **Codex Skills**。当前 Codex repo 级入口是
  `.agents/skills/<name>/SKILL.md`, 支持从当前目录向仓库根逐级发现, 并跟随可用的 symlink。置信: 高。
- **两工具均原生读仓库根 `AGENTS.md`**。置信: 高。
- OpenSpec (Fission-AI/OpenSpec) 是参考实现: 从单一 schema 为 31+ 工具生成命令, Claude 用冒号、
  Cursor/Windsurf 用连字符; 配置文件是 `openspec/config.yaml` (非 custom.yaml)。
