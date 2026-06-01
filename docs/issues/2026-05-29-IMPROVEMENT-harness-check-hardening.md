# 描述
- harness-check 校验器的两项加固 (最终评审 Minor, 非阻断), 留待后续。已落地的第三项
  (孤儿 playbook 检测) 不在此列。

# 重现步骤
- 1. 将某 `.agents/workflow/<verb>.md` 截断为 0 字节, 跑 `pnpm harness:check`
- 2. 检查 `docs/works/_archive` 与 `docs/friction/_archive` 是否被 git 跟踪

# 预期结果
- 1. 空 playbook 应报错 (它是操作真源)
- 2. 两个 _archive 目录应存在于版本库

# 实际结果
- 1. `checkWorkflowSources` 仅用 existsSync, 0 字节文件通过校验
- 2. git 不跟踪空目录, 两个 _archive 未提交 (archive.md 运行时 mkdir -p, 功能无碍)

# 解决方案
- 待办 1: checkWorkflowSources 增加非空 (或含 `# harness-<verb>` 头) 断言
- 待办 2: 为两个 _archive 目录各加 .gitkeep
- 已落地: 孤儿 playbook 检测 (`workflow: unexpected playbook`) 已在 harness-check.mjs 实现并测试
