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

产出: `docs/works/{task}/` 初始化完成, phase=explore。
完成提示用户: 下一步 `/opsx:explore`。
