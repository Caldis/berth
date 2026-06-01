# Superpowers 流程产物会绕开 harness 任务态

> 可在正文交叉引用 task_id / issue, 不拆子目录。优化后移入 _archive/。

## 发生阶段

implement

## 现象

Superpowers 的 `brainstorming` / `writing-plans` / `executing-plans` 会要求把 spec 和 plan 写到 `docs/superpowers/`, 并在执行阶段询问用户选择 subagent 并行或主 session 执行。这会绕开 berth 已经建立的 `docs/works/{date}-gh-{number}-{summary}` 任务态, 也会和本项目“不使用 worktree、主分支、小步提交”的规则冲突。

## 工程师介入动作

用户明确要求默认使用 harness workflow, 只有用户主动选择 Superpowers 时才允许其接管流程。用户也指出 `brainstorming` 的意图澄清适合 design, 但问题不能过细; 执行并行策略应由 Agent 根据任务结构自主判断, 不应把执行模式选择交给用户。

## 沉淀的上下文/规则

- 默认流程是 harness workflow。
- 进入 harness 后, Superpowers 只能作为方法参考, 不能创建 active `docs/superpowers/plans` 或 `docs/superpowers/specs` 产物。
- `brainstorming` 可被 design 借鉴为最多 3 个关键问题, 只问影响范围、方案或验收的内容。
- 并行/顺序执行由 Agent 根据文件重叠、模块边界、任务依赖和测试耦合度判断。

## 建议的流程改进

在 `AGENTS.md` 和 `.agents/workflow/_shared.md` 写明流程优先级; 在 `harness-check` 中禁止新增 active Superpowers plan/spec; 在 design/implement playbook 中写入受控借鉴和自主执行策略。
