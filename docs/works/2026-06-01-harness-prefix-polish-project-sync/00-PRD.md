# 原始输入快照

## 需求

把 berth 当前 harness 工作流做一次完整改造:

1. 将 OpenSpec 遗留的 `opsx-*` 前缀迁移为 berth 自己的 `harness-*` 前缀。
2. 新增可选的 `polish` / 抛光阶段, 放在 verify 后、archive 前。
3. 抛光阶段只处理当前任务范围内的问题, 包括:
   - 是否有可继续深挖的问题;
   - 是否有交互和视觉可优化点;
   - 是否有可用性、应用性相关可优化点;
   - 是否有性能可优化点。
4. 抛光阶段可能耗时, 必须是可选的:
   - 用户主动要求时才执行;
   - 或 Agent 完成非常复杂、非常有难度的任务后, 只询问用户是否执行;
   - Agent 绝对不能自行执行。
5. GitHub Projects 同步必须成为 archive 闭环:
   - new 阶段创建或记录 Project item;
   - archive 阶段强制把 Project item 置为 Done;
   - archive 不能忘记同步 Project 状态。

## 已确认设计取舍

- skill / slash 命名采用 `harness-<verb>`, 包括 `harness-polish`。
- GitHub Project 同步失败时, archive 应阻塞, 不允许本地归档成功但远端 Project 仍停在 In Progress。

## 外部事实

- Claude Code skills 的 slash 入口跟 skill 目录名走, 因此适合 `harness-<verb>`。
- Codex repo skill 从 `.agents/skills/<name>/SKILL.md` 发现, 显式调用用 `$<name>`。
- `gh project item-edit` 支持通过 `--field-id` 与 `--single-select-option-id` 修改 Projects 单选字段。
