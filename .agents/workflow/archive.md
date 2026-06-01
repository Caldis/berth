# harness-archive — 归档

目标: 完成一个任务。

前置: verify 全部通过。

步骤:
1. GitHub Project: 运行 `node scripts/harness-projects.mjs done docs/works/{task}`。
   - 该命令会复用或补建任务 item, 将 Status 置 Done, 再回读 Project item 确认。
   - 若缺少 `project` / `read:project` scope, 提示用户运行 `gh auth refresh -h github.com -s project,read:project` 后停止; 不移动目录。
   - 若远端回读不是 Done, 停止 archive。
2. 将 INDEX.phase 置 archive。
3. 将 `docs/works/{task}/` 整体移动到 `docs/works/_archive/{task}/`, 避免污染上下文。
4. 提交代码 (遵守提交规范), 准备提测。提交前只暂存自己相关文件, 用 `git diff --cached` 核对 staged 集合, 不提交无关工作区改动。
5. 若任务关联 `docs/issues/`, 更新其状态并交叉引用归档路径。

产出: 任务归档 + commit + gh project item 关闭。
