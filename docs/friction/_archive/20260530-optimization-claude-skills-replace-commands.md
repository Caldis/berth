# 工程摩擦记录

## 发生阶段
optimization

## 现象
用户指出 Claude Code 可以自动关联 skills 并用 slash 触发。原 harness 仍额外生成 `.claude/commands/opsx-*.md`, 把 Claude commands 当作必要分发层, 容易造成同名入口重复和文档判断过时。

## 工程师介入动作
查阅 Claude Code / Anthropic 官方文档后确认: custom commands 已合并进 skills, `.claude/skills/<skill-name>/SKILL.md` 会生成 `/<skill-name>`, 且 `description` 可用于自动触发; `.claude/commands/*.md` 仍兼容, 但不再是推荐入口。

## 应沉淀的上下文或规则
Claude 侧只分发 `.claude/skills/opsx-<verb>`。Codex 侧继续读取 `.agents/skills/opsx-<verb>/SKILL.md`。`pnpm harness:sync` 必须清理历史生成的 `.claude/commands/opsx-*.md`, `pnpm harness:check` 必须把这些历史桩视为分发漂移。

## 建议的流程改进
维护 `.agents/references/ai-tool-command-distribution.md` 时优先核对 Claude Code 最新 skills 文档。涉及 Claude slash 入口时, 默认先判断 skill 是否已能提供该入口, 不再先加 command 桩。
