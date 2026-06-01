# Design: 技术方案

## 数据契约

### Skill 命名

新增共享常量:

- `SKILL_PREFIX = 'harness'`
- `LEGACY_SKILL_PREFIXES = ['opsx']`
- `VERBS = ['new', 'continue', 'explore', 'design', 'implement', 'verify', 'polish', 'archive', 'optimization']`

`skillName(verb)` 返回 `harness-${verb}`。所有分发路径和 SKILL.md frontmatter 均从该函数生成。

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
   - `skillMdContent()` 使用 `harness-${verb}`。

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

6. `.agents/workflow/polish.md`
   - 新增可选抛光 playbook。
   - 明确不得自动执行、不得越界、默认只产出建议。

7. workflow 文档和模板
   - `.agents/workflow/_shared.md`, `new.md`, `verify.md`, `archive.md`, `optimization.md` 等改为 `harness-*`。
   - `archive.md` 增加 Project Done 硬门禁。
   - `docs/works/_template/INDEX.md` 与新增 `04-POLISH.md`。
   - `docs/friction/_template.md`, `docs/issues/AGENTS.md`, `.agents/README.md`, `AGENTS.md` 同步入口和规则。

## 测试策略

1. `tests/harness/sync.test.ts`
   - 断言生成 `harness-*`。
   - 断言生成 9 个 verb。
   - 断言旧 `opsx-*` skill / command 会被清理。

2. `tests/harness/check.test.ts`
   - 断言 `phase=polish` 缺 `04-POLISH.md` 报错。
   - 断言 friction 命名接受 `polish`。
   - 断言 workflow sources 要求 `polish.md`。

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

