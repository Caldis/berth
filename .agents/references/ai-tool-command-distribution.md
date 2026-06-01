# 参考: 多工具 skill 分发事实

为 Claude Code + Codex 双工具分发 workflow skill 的已核实事实 (2026-05-30, 官方一手来源)。
harness 的分发架构 (见 .agents/README.md) 依据本文档, 改动分发逻辑前先复核此处。

- **Claude Code skills 原生提供 slash 入口**: `.claude/skills/<skill-name>/SKILL.md` 暴露为
  `/<skill-name>`; 目录名决定 slash 名称, `description` 参与自动触发判断。
- **Claude custom commands 已合并进 skills**: `.claude/commands/*.md` 仍可用作兼容入口, 但官方建议使用
  skills; 同名 skill 与 command 同时存在时, skill 优先。harness 只生成 `harness-*` skills,
  `pnpm harness:sync` 会清理历史生成的旧前缀 skill 与 command 桩。
- **Claude Code `.claude/skills/` 可分发软链或目录副本**: Windows checkout 可能把 Git symlink 落成普通文本文件。
  故 `.claude/skills` 允许软链或目录副本。
- **Codex custom prompts 已废弃并在 HEAD 删除** (openai/codex commit 48144a7), 仅曾支持全局
  `~/.codex/prompts/` (无项目级)。替代: **Codex Skills**。当前 Codex repo 级入口是
  `.agents/skills/<name>/SKILL.md`, 支持从当前目录向仓库根逐级发现, 并跟随可用的 symlink。置信: 高。
- **两工具均原生读仓库根 `AGENTS.md`**。置信: 高。
- OpenSpec (Fission-AI/OpenSpec) 是参考实现: 从单一 schema 为 31+ 工具生成命令, Claude 用冒号、
  Cursor/Windsurf 用连字符; 配置文件是 `openspec/config.yaml` (非 custom.yaml)。
