# /opsx:new — 启动新任务

输入: 任务描述 + 可选 Jira ID (参数 $ARGUMENTS)。

步骤:
1. 读取 `.agents/workflow/_shared.md` 的命名与状态契约。
2. 确定任务类型 (feature / bug) 与 SUMMARY (kebab-case)。
3. 计算目录名 `{今日YYYY-MM-DD}[-{JIRA}]-{SUMMARY}`, 在 `docs/works/` 下创建。
4. 从 `docs/works/_template/` 拷贝模板:
   - 公共: INDEX.md, 01-ANALYSIS.md, 02-SPEC.md, 03-PLAN.md
   - feature 拷 00-PRD.md; bug 拷 00-BUG.md
5. 填写 INDEX.md frontmatter: task / type / jira / phase=explore / created。
6. 若有 PRD/BUG 来源, 将原始内容快照写入 00-PRD.md 或 00-BUG.md。
7. gh project 跟踪 (见 .agents/tools.md 的 scope 前置):
   - 先检查 `gh project list --owner Caldis` 是否可用; 若报缺 project scope, STOP 并提示用户运行
     `gh auth refresh -h github.com -s project,read:project` (浏览器授权, Agent 不可代办), 然后跳过本步, 不阻塞代码流程。
   - 可用时: 复用既有 berth project (无则 `gh project create`), 用 `gh project item-create` 加一条 item,
     title = 任务名, 状态置 Todo; 将 item URL 回写 INDEX.md 的 gh project 段。

产出: `docs/works/{task}/` 初始化完成, phase=explore (gh project item 已建或已记录待授权)。
完成提示用户: 下一步 `/opsx:explore`。
