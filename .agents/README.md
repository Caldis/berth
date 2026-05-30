# .agents — AI Native Workflow Harness

berth 的 Agent 工作流单一真源, 同时服务 Claude Code 与 Codex。

## 结构

- `workflow/` — 流程 playbook (唯一真源, 手写)
  - `_shared.md` 门禁与状态契约; 8 个 verb 各一份。
- `skills/opsx-<verb>/SKILL.md` — 薄指针 (由 `pnpm harness:sync` 生成, 勿手改)。
- `tools.md` — 可用工具索引。
- `references/` — 一手事实参考 (如 ai-tool-command-distribution.md: 双工具命令分发的官方核实结论)。

## 分发

`pnpm harness:sync` 幂等生成:
- `.agents/skills/opsx-<verb>/SKILL.md`
- `.claude/skills/opsx-<verb>` 软链或目录副本 (Claude Code 由 skill 提供 `/opsx-<verb>` 并可按 description 自动触发)
- Codex 原生读取 `.agents/skills`, 不再分发 `.codex/skills`
- 历史生成的 `.claude/commands/opsx-<verb>.md` 会被清理; Claude Code 官方已将 custom commands 合并进 skills

`pnpm harness:check` 校验产物/模板/命名/分发。CI 强制。

## 调用

- Claude Code: `/opsx-<verb>` (由 `.claude/skills/opsx-<verb>/SKILL.md` 提供, 也可自动触发)
- Codex: `$opsx-<verb>` (skill)

verb: new · continue · explore · design · implement · verify · archive · optimization

## 何时进入

- feature / bug 开发任务: 落代码前必须用 `opsx-new` 建任务态, 禁止跳过直接实现或调试。
- 小改动 (单行/拼写/纯文案注释, 或单一文件·单一关注点·门禁即可验收的小改动如弃用 API 替换) 可直接处理 + 跑门禁, 不建任务态。小改动豁免前必须先声明豁免依据并征得用户确认。
- 存疑默认走 harness; 进行中的任务用 `opsx-continue` 续跑。

## 四阶段

Explore → Design → Implementation → Verify。人在 design 澄清意图, 在 verify 确认验收, 其余交给 Agent。
状态见各任务 `docs/works/{task}/INDEX.md`; 摩擦见 `docs/friction/`。

## 观测 (v2)

工作流健康度观测机制留待 v2, 当前未实现。
