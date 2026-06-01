# Design: 技术方案

## 数据契约

### Skill 命名

新增共享常量:

- `SKILL_PREFIX = 'harness'`
- `LEGACY_SKILL_PREFIXES = ['opsx']`
- `WORKFLOW_ACTIONS = ['0.0-new', '0.1-continue', '1.0-explore', '2.0-design', '3.0-implement', '3.1-polish', '4.0-verify', '5.0-archive', '5.1-friction', '5.2-issues']`

`skillName(actionId)` 返回 `harness-${actionId}`。所有分发路径和 SKILL.md frontmatter 均从该函数生成。

对应验收: A1, A2, A3。

### 任务阶段

`PHASES` 增加 `polish`; 阶段顺序:

`explore -> design -> implement -> verify -> polish -> archive`

`phase=polish` 的必备产物:

- source: `00-PRD.md` 或 `00-BUG.md`
- `01-ANALYSIS.md`
- `02-SPEC.md`
- `03-PLAN.md`
- `04-POLISH.md`

`04-POLISH.md` 是可选阶段产物, 但一旦 `INDEX.phase=polish`, 必须存在。

对应验收: A4, A5, A6。

### GitHub Project

新任务的标准 frontmatter:

```yaml
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_...
  item_status: In Progress
```

`archive` 前必须将远端 item 状态改成 `Done`, 复核后把 `item_status` 更新为 `Done`。缺 scope、缺 item 且无法补建、复核失败都阻塞 archive。

对应验收: A7, A8。

## 模块改动

1. `scripts/harness-lib.mjs`
   - 增加 `SKILL_PREFIX`, `LEGACY_SKILL_PREFIXES`, `skillName()`。
   - `VERBS` 增加 `polish`。
   - `skillMdContent()` 使用 `harness-${action-id}`。

2. `scripts/harness-sync.mjs`
   - `desiredArtifacts()` 使用 `skillName()`。
   - 旧产物清理覆盖:
     - `.agents/skills/opsx-<verb>`
     - `.claude/skills/opsx-<verb>`
     - `.codex/skills/opsx-<verb>`
     - `.claude/commands/opsx-<verb>.md`
     - `.claude/commands/opsx/<verb>.md`
   - `check()` 把旧产物存在视为 drift。

3. `scripts/harness-check.mjs`
   - friction 文件名 phase 段从 `VERBS` 生成, 自动包含 `polish`。
   - `PHASES` / `PHASE_RANK` 增加 `polish`。
   - `requiredArtifacts()` 在 polish 阶段要求 `04-POLISH.md`。
   - `checkTemplates()` 要求 `docs/works/_template/04-POLISH.md`。

4. `scripts/harness-projects.mjs`
   - 新增 Projects helper。
   - `done <task-dir>`: 同步指定任务的 Project item 到 Done, 复核远端状态, 更新 INDEX。
   - `check`: 只读审计 Project 状态漂移。
   - 导出纯函数给单测覆盖 Project field / option / item 匹配逻辑。

5. `package.json`
   - 新增 `harness:projects:check`。

6. `.agents/workflow/3.1-polish.md`
   - 新增可选抛光 playbook。
   - 明确不得自动执行、不得越界、默认只产出建议。

7. workflow 文档和模板
   - `.agents/workflow/_shared.md`, `0.0-new.md`, `4.0-verify.md`, `5.0-archive.md`, `5.1-friction.md` 等改为 `harness-*`。
   - `archive.md` 增加 Project Done 硬门禁。
   - `docs/works/_template/INDEX.md` 与新增 `04-POLISH.md`。
   - `docs/friction/_template.md`, `docs/issues/AGENTS.md`, `.agents/README.md`, `AGENTS.md` 同步入口和规则。

## 测试策略

1. `tests/harness/sync.test.ts`
   - 断言生成 `harness-*`。
   - 断言生成 10 个 action。
   - 断言旧 `opsx-*` skill / command 会被清理。

2. `tests/harness/check.test.ts`
   - 断言 `phase=polish` 缺 `04-POLISH.md` 报错。
   - 断言 friction 命名接受 `polish`。
   - 断言 workflow sources 要求 `3.1-polish.md`。

3. `tests/harness/projects.test.ts`
   - 覆盖 Status field / Done option 查找。
   - 覆盖从 item-list 输出按 item id / task title 匹配 item。
   - 覆盖 INDEX frontmatter 状态更新。

4. 验证命令
   - `pnpm test tests/harness/sync.test.ts tests/harness/check.test.ts tests/harness/projects.test.ts`
   - `pnpm typecheck:node`
   - `pnpm harness:sync`
   - `pnpm harness:check`
   - `pnpm harness:projects:check` 若当前 `gh` scope 可用, 作为只读审计执行; 不放入普通 CI。

## 错误处理

1. GitHub Project 缺 scope:
   - `done` 命令退出非 0。
   - 输出 `gh auth refresh -h github.com -s project,read:project`。
   - archive 阻塞。

2. 找不到 Status field 或 Done option:
   - 命令退出非 0。
   - 输出项目字段缺口, 不猜 id。

3. 缺 `item_id`:
   - 优先用 task 名和标题在 Project item list 中查找。
   - 仍找不到时创建 draft issue item。
   - 创建后回写 `item_id`。

4. 远端复核不是 Done:
   - 命令退出非 0。
   - 不移动任务到 `_archive`。

## 追加设计: 有序 action 与堆积清理

### Action ID

`INDEX.phase` 继续保留简单状态值, 例如 `explore` / `implement` / `verify`; 它只表达任务状态, 不承担展示排序。

新增 `action id` 作为 workflow 步骤和动作的可读编号:

- `0.0-new`
- `0.1-continue`
- `1.0-explore`
- `2.0-design`
- `3.0-implement`
- `3.1-polish` (可选, 关联 implement)
- `4.0-verify`
- `5.0-archive`
- `5.1-friction` (可选, 归档后收敛 friction)
- `5.2-issues` (可选, 归档后收敛 docs/issues)

后续分发产物使用 `harness-{action-id}` 作为 skill 名, 例如 `harness-3.0-implement`。workflow 源文件使用 `.agents/workflow/{action-id}.md`。

### Friction 与 issues 堆积

friction 文件名从 `{YYYYMMDD}-{phase}-{summary}.md` 改为 `{YYYYMMDD}-{action-id}-{summary}.md`, 例如 `20260601-3.0-implement-test-discipline-gap.md`。

新增 `5.2-issues` 动作用于处理 `docs/issues/` 的活跃问题:

- 已修复: 补解决记录并移入 `docs/issues/resolved/`。
- 仍有效且值得做: 转为 GitHub Issue / work 任务。
- 重复或过期: 写明原因后移入 resolved。
- 与当前任务相关但不在当前验收范围: 保持交叉引用, 不顺手修。

`archive` 完成时不自动执行 `5.1-friction` 或 `5.2-issues`, 只在归档报告中提醒本次产生/关联的 friction 与 issues, 并列出可选下一步。

### 追加命名修正

`5.1-optimization` 改名为 `5.1-friction`。理由:

- `optimization` 容易被理解为代码性能、上下文或泛化优化。
- 该动作实际输入队列是 `docs/friction/`, 与 `5.2-issues` 的命名方式应保持一致。
- 旧 `harness-5.1-optimization` 作为 legacy 产物由 `pnpm harness:sync` 清理。
