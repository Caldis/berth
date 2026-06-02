# 需求分析 (Explore 产物)

## 现状理解
本任务只涉及 harness 操作体系, 不涉及 Electron main/preload/renderer 的产品 IPC 契约。

当前相关模块:
- `.agents/workflow/_shared.md`: `INDEX.md` frontmatter 契约仍写 `type: feature # feature | bug`, 没有 maintenance、source、priority、debt。
- `.agents/workflow/0.0-new.md`: 新任务只判断 `feature / bug`, 创建 GitHub Issue, 调用 `node scripts/harness-projects.mjs ensure <task>` 绑定 Project item。
- `.agents/workflow/1.0-explore.md` / `2.0-design.md` / `3.0-implement.md` / `4.0-verify.md` / `5.0-archive.md`: 已有测试证据、外部契约检索、Project archive gate 等规则, 但没有 debt estimate/final/revisions 的逐步校准规则。
- `docs/works/_template/INDEX.md`: 模板只含 `type / phase / issue / gh_project / artifacts`。
- `scripts/harness-check.mjs`: `checkWorks()` 只允许 `feature | bug`, 并按 type 判断 `00-PRD.md` / `00-BUG.md`。这会直接阻止 `maintenance` active work。
- `scripts/harness-stats.mjs`: 只统计 works phase、friction active/archive、issues active/resolved 和分发漂移, 没有 debt pool。
- `scripts/harness-projects.mjs`: 只同步 Project `Status` 字段, `ensure` 置 `In Progress`, `done` 置 `Done`; 不同步 task type、priority、日期、scope、risk、debt。
- `scripts/harness-sync.mjs`: workflow skill 分发从 `harness-lib.mjs` 生成, 本任务若只改 workflow 正文, 不需要新增 action, 但需要保证 `pnpm harness:sync` 不产生漂移。
- `tests/harness/check.test.ts`, `tests/harness/stats.test.ts`, `tests/harness/projects.test.ts`: 已覆盖当前 schema、统计和 Project 状态同步, 是本任务的主要测试入口。

## 关联与依赖
本地调用关系:
- `pnpm harness:check` -> `scripts/harness-check.mjs` -> `checkWorks()` / `checkEntryRules()` / `checkTemplates()` / `checkDistribution()`。
- `pnpm harness:stats` -> `scripts/harness-stats.mjs` -> 读取 `docs/works/**/INDEX.md` 和 docs/friction/docs/issues。
- `node scripts/harness-projects.mjs ensure|done|check` -> 读取 `INDEX.md` -> `gh project` / `gh issue` -> 回写 `issue` 与 `gh_project` block。

远端 GitHub 事实:
- GitHub Project 6 当前字段只有内置字段: `Title`, `Assignees`, `Status`, `Labels`, `Linked pull requests`, `Milestone`, `Repository`, `Reviewers`, `Parent issue`, `Sub-issues progress`, `Created`, `Updated`, `Closed`。没有 `Priority`, `Start date`, `Target date`, `Task Type`, `Debt` 等自定义字段。
- `gh project field-create` 支持创建 `TEXT | SINGLE_SELECT | DATE | NUMBER` 字段; `gh project item-edit` 支持 text、number、date、single-select option 写入。对应官方 CLI 文档: https://cli.github.com/manual/gh_project_item-edit
- GitHub GraphQL ProjectV2 item field values 支持 text、number、date、assignees、labels、single-select、iteration、milestone。官方文档: https://docs.github.com/en/graphql/reference/projects
- GitHub Issue Fields 在 2026-05 仍是 public preview, 支持 REST/GraphQL, 但存在预览变动风险。官方 changelog: https://github.blog/changelog/2026-05-21-issue-fields-are-now-in-public-preview-for-all-organizations/
- GitHub Issue Types REST endpoint 是组织级 `/orgs/{org}/issue-types`; 当前仓库 owner 是用户 `Caldis`, `gh api /orgs/Caldis/issue-types` 返回 404。当前 `gh issue create/edit --help` 也没有 `--type` 参数。因此本任务不能把 Issue Type 同步作为当前仓库的硬性实现路径。

设计取舍:
- 本地 `INDEX.md` 继续作为唯一可信状态源; GitHub Project 作为同步展示面。
- `issue` / `friction` 不作为 maintenance subtype, 改为 `source.kind`。
- debt 不能在 `0.0-new` 一次性定死, 需要 `estimate`、`final` 和重要 `revisions`。
- debt pool 不写共享总文件, 从各任务 `INDEX.md` 聚合计算, 避免多 Agent 并发写冲突。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. `INDEX.md` 契约支持 `type: feature | bug | maintenance`, maintenance subtype, source, priority, target date, debt estimate/final/revisions; 旧任务缺 debt 不报错, 统计为 unscored/0。
2. `harness:check` 接受合法 maintenance task, 拒绝非法 type/subtype/source/scope/risk/confidence/priority/debt number, 并保留现有 issue/project/phase/artifact 校验。
3. `harness:stats` 输出 debt pool 总分、阈值状态、unscored 数量, 并按 area / task type 分组; 旧统计 works/friction/issues/dist 不退化。
4. `harness-projects` 能发现或创建 Project 自定义字段, 并同步 task type、priority、日期、debt、scope、risk 等字段; 当前用户仓库不支持组织级 Issue Type 时, 采用 Project 自定义 `Task Type` 字段, 不伪装成 GitHub Issue Type。
5. 远端字段缺失、选项缺失或授权缺失时, `harness-projects check --strict` 给出明确错误或前置命令; 不写 `TBD` / `TODO` / 手写占位字段 id。
6. workflow 文档说明 debt 的逐步校准: `0.0-new` 写低置信 estimate, explore/design 校准, implement 有重大变化写 revision, verify 写 final, archive 要求 final 可统计。
7. `docs/works/_template` 反映新字段与使用说明; 当前任务仍能通过 `pnpm harness:check --work docs/works/2026-06-02-gh-76-harness-task-type-debt-workflow`。
8. 目标 harness tests 覆盖 check/stats/projects 的新增行为; 全局 `pnpm harness:check`, `pnpm typecheck`, 目标测试通过。

## 界面质量与交互验收
不适用。本任务不改 renderer UI。

## 未决问题
留给 design 向人澄清。

无必须阻塞 design 的问题。

实现阶段需注意:
- 当前 Project 6 无自定义字段, 设计应支持 `fields ensure` 或等价前置, 不能假定字段存在。
- 当前用户仓库不能通过组织级 Issue Type API 设置真实 GitHub Issue Type; 本任务应把 Project `Task Type` 字段作为当前可执行同步路径, 并在文档中说明组织仓库迁移后的可选 Issue Type 层。
