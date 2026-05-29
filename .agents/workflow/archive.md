# /opsx:archive — 归档

目标: 完成一个任务。

前置: verify 全部通过。

步骤:
1. 将 INDEX.phase 置 archive。
2. 将 `docs/works/{task}/` 整体移动到 `docs/works/_archive/{task}/`, 避免污染上下文。
3. 提交代码 (遵守提交规范), 准备提测。
4. 若任务关联 issues/, 更新其状态并交叉引用归档路径。
5. gh project: 将该任务的 project item 状态更新为 Done (若 new 阶段因缺 scope 未建, 授权后补建并直接置 Done)。

产出: 任务归档 + commit + gh project item 关闭。
