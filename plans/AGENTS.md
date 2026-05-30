> 重定向: 任务的活动态 (Explore/Design/Implement/Verify 产物) 已迁至 AI Native Workflow 的
> `docs/works/{date}[-{jira}]-{summary}/`, 由 `/opsx:*` 命令维护。本目录保留历史计划
> (如 v0.1-development.md) 作为存档参考。新任务请用 `/opsx:new`。详见 `.agents/README.md`。

# PLANS
存放任务计划和执行清单, 维护任务进度持续进行
- 如果某个任务可被分解为至少 3 个子任务, 请在本目录维护进度, 否则直接执行
- 进度文档按照 {YYYY-MM-DD}-{SHORT_DESCRIPTION}.md 命名
- 如果某个任务和 `docs/issues/` / prd 关联, 则 {SHORT_DESCRIPTION} 使用同名称命名, 并在两个文档中暴露双向引用
- 如果任务过大, 进一步拆解为子任务
- 每个子项开始/完成时, 必须同步更新任务进度
- 始终假定有其他 AI Agent 在并行工作, DOING_TASK_NAME 默认视为其他 Agent 正在处理, 只在用户主动要求时才处理
- 所有内容完成后, 整体移入 reolved 目录

# TEMPLATE
```
# PLAN_NAME
PLAN_DESC

[x] DONE_TASK_NAME: TASK_DESC
    [X] SUB_TASK_1: SUBTASK_DESC
[-] DOING_TASK_NAME: TASK_DESC
[ ] WAITING_TASK: TASK_DESC
```
