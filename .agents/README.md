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
- `.claude/skills/opsx-<verb>` 与 `.codex/skills/opsx-<verb>` 软链
- `.claude/commands/opsx/<verb>.md` 命令桩 (commands 不跟随软链, 故复制)

`pnpm harness:check` 校验产物/模板/命名/分发。CI 强制。

## 调用

- Claude Code: `/opsx:<verb>` (命令) 或 `opsx-<verb>` (skill)
- Codex: `opsx-<verb>` (skill)

verb: new · continue · explore · design · implement · verify · archive · optimization

## 四阶段

Explore → Design → Implementation → Verify。人在 design 澄清意图, 在 verify 确认验收, 其余交给 Agent。
状态见各任务 `docs/works/{task}/INDEX.md`; 摩擦见 `docs/friction/`。

## 观测 (v2)

工作流健康度观测机制留待 v2, 当前未实现。
