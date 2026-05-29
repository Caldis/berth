# 参考: 多工具命令/skill 分发事实

为 Claude Code + Codex 双工具分发斜杠命令/skill 的已核实事实 (2026-05-29, 官方一手来源)。
harness 的分发架构 (见 .agents/README.md) 依据本文档, 改动分发逻辑前先复核此处。

- **Claude Code 冒号命名空间成立**: `.claude/commands/<ns>/<cmd>.md` 渲染为 `/<ns>:<cmd>`
  (子目录即命名空间)。实测印证 (与官方 skills.md "子目录不影响命名" 的表述冲突, 以实测为准)。置信: 高。
- **Claude Code `.claude/commands/` 不跟随符号链接** (GitHub issue 39475/10573); 而 `.claude/skills/`
  跟随。故跨工具单一真源用 skill 软链, command 只能复制。置信: 中-高。
- **Codex custom prompts 已废弃并在 HEAD 删除** (openai/codex commit 48144a7), 仅曾支持全局
  `~/.codex/prompts/` (无项目级)。替代: **Codex Skills** `.codex/skills/<name>/SKILL.md`,
  项目级、支持子目录、跟随软链。置信: 高。
- **两工具均原生读仓库根 `AGENTS.md`**。置信: 高。
- OpenSpec (Fission-AI/OpenSpec) 是参考实现: 从单一 schema 为 31+ 工具生成命令, Claude 用冒号、
  Cursor/Windsurf 用连字符; 配置文件是 `openspec/config.yaml` (非 custom.yaml)。
