# opsx-continue — 继续已有任务

输入: 任务目录名或 Jira ID (参数 $ARGUMENTS); 为空时列出 `docs/works/` 下所有未归档任务供选择。

步骤:
1. 定位任务目录, 读取 INDEX.md frontmatter。
2. 按 `phase` 路由:
   - explore → 执行 `.agents/workflow/explore.md`
   - design → 执行 `.agents/workflow/design.md`
   - implement → 执行 `.agents/workflow/implement.md`
   - verify → 执行 `.agents/workflow/verify.md`
   - blocked → 向用户展示 INDEX 中标注的待澄清项, 澄清后回 design
   - archive → 提示该任务已可归档, 执行 `.agents/workflow/archive.md`
3. 不重置已完成阶段的产物。

产出: 续跑当前阶段。
