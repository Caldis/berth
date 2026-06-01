# harness-new — 启动新任务

输入: 任务描述 + 可选 GitHub Issue 引用 (`GH-123` / `#123` / issue URL, 参数 $ARGUMENTS)。

步骤:
1. 读取 `.agents/workflow/_shared.md` 的命名与状态契约。
2. 确定任务类型 (feature / bug) 与 SUMMARY (kebab-case)。
3. 绑定 GitHub Issue:
   - 若输入已有 Issue 引用, 用 `gh issue view` 读取真实 `number` / `url` / `id`。
   - 若没有 Issue, 用 `gh issue create` 创建仓库 Issue, 标题取任务标题, body 记录来源摘要。
   - 若 `gh` 缺少权限或无法确定 Issue, STOP; 不进入 explore。
4. 计算 `task_id=GH-{issue_number}` 与目录名 `{今日YYYY-MM-DD}-gh-{issue_number}-{SUMMARY}`, 在 `docs/works/` 下创建。
5. 从 `docs/works/_template/` 拷贝模板:
   - 公共: INDEX.md, 01-ANALYSIS.md, 02-SPEC.md, 03-PLAN.md
   - feature 拷 00-PRD.md; bug 拷 00-BUG.md
6. 填写 INDEX.md frontmatter: task / task_id / type / phase=explore / created / issue。
7. 若有 PRD/BUG 来源, 将原始内容快照写入 00-PRD.md 或 00-BUG.md。
8. gh project 跟踪 (见 .agents/tools.md 的 scope 前置):
   - 先检查 `gh project list --owner Caldis` 是否可用; 若报缺 project scope, STOP 并提示用户运行
     `gh auth refresh -h github.com -s project,read:project` (浏览器授权, Agent 不可代办), 然后停止; 授权后重跑本步。
   - 可用时运行 `node scripts/harness-projects.mjs ensure docs/works/{task}`。
   - **gh node id (project/item/field/option) 一律从 `gh --format json` 输出取真实 id; 严禁手敲或凭记忆填**。
   - 确认 INDEX.md 已回写 `gh_project.item_id` 和 `item_status: In Progress`。

产出: `docs/works/{task}/` 初始化完成, phase=explore, GitHub Issue 与 Project item 已绑定。
完成提示用户: 下一步 `harness-explore`。
