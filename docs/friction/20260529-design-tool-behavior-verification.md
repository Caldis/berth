# 工程摩擦记录

## 发生阶段
design (harness 双工具分发机制设计)。

## 现象
设计 `/opsx:*` 命令的双工具 (Claude Code + Codex) 分发时, 关键机制存在相互冲突的信息源,
无法凭记忆判定, 一度阻塞设计:
1. Claude Code 子目录命令是否渲染为冒号命名空间 (`/opsx:new`): 官方 skills.md 表述"子目录
   只影响描述不影响命名", 与 OpenSpec 生产文档"Claude 用冒号、其他工具用连字符"直接矛盾。
2. `.agents/` 软链分发到 `.claude/commands/` 是否被发现。
3. Codex 自定义 prompt 的位置与参数语法。

## 工程师介入动作
派 3 个研究 agent 并行核对官方一手来源 (含逐行读 openai/codex Rust 源码), 带引用与置信度。

## 应沉淀的上下文或规则 (验证结论)
1. Claude Code `.claude/commands/<ns>/<cmd>.md` 子目录**确实**渲染为 `/<ns>:<cmd>` 冒号命名空间。
   本次实测印证: 生成产物后 `/opsx:new`…`/opsx:optimization` 与 `opsx-new` skill 双双注册。
   置信: 高 (实测 + OpenSpec 生产行为)。skills.md 的表述在此点上不准确。
2. Claude Code `.claude/commands/` **不跟随符号链接** (GitHub issue 39475/10573); `.claude/skills/`
   与 `.codex/skills/` **跟随**符号链接。故: skill 走软链, command 桩走复制。置信: 中-高。
3. Codex custom prompts **已废弃并在 HEAD 删除** (commit 48144a7), 且仅支持全局 `~/.codex/prompts/`,
   无项目级。替代为 Codex Skills (`.codex/skills/<name>/SKILL.md`, 项目级、跟随软链)。置信: 高。
   → 这是双工具最终都收敛到 skills 的根因。
4. 两工具均原生读取仓库根 `AGENTS.md`。置信: 高。

## 建议的流程改进 (已落地)
分发架构 = `.agents/` 单一真源 + skill 软链 (双工具) + Claude 命令桩复制。
见 .agents/README.md 与 docs/superpowers/specs/2026-05-29-ai-native-workflow-harness-design.md §4/§15。
后续若 Claude Code 修复 commands 软链, 可将命令桩从复制改为软链, 消除复制层。
