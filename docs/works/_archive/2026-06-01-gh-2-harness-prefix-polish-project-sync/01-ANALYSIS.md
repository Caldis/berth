# Explore: 现状理解

## 代码与流程现状

1. 当前 harness 真源在 `.agents/workflow/*.md`, 分发产物由 `scripts/harness-lib.mjs` 和 `scripts/harness-sync.mjs` 生成。
2. `opsx-*` 前缀同时存在于:
   - `.agents/skills/opsx-*/SKILL.md`
   - `.claude/skills/opsx-*`
   - `.agents/workflow/*.md`
   - `.agents/README.md`
   - `AGENTS.md`
   - `docs/works/_template/INDEX.md`
   - `docs/issues/AGENTS.md`
   - `docs/friction/_template.md`
   - `tests/harness/sync.test.ts`
3. `scripts/harness-check.mjs` 用 action id 检查 workflow playbook 是否齐全, 当前动作从 `0.0-new` 到 `5.2-issues`。
4. 现有阶段枚举没有 `polish`; `checkWorks()` 不接受 `phase=polish`。
5. GitHub Project 规则写在 `.agents/workflow/0.0-new.md` 与 `.agents/workflow/5.0-archive.md`, 但没有脚本强制执行。`5.0-archive.md` 要求把 item 置 Done, 实际靠 Agent 手动操作。
6. 远端 Project #6 可访问, 已确认:
   - project id: `PVT_kwHOADXbEs4BZHvQ`
   - Status field id: `PVTSSF_lAHOADXbEs4BZHvQzhUIssM`
   - Status options: `Todo=f75ad846`, `In Progress=47fc9ee4`, `Done=98236657`
7. 本任务 GitHub Project item 已创建并置为 In Progress:
   - item id: `PVTI_lAHOADXbEs4BZHvQzguV4rw`

## 外部事实

1. Claude Code skills 的 slash 入口由 skill 目录名决定, 因此 `.claude/skills/harness-0.0-new/SKILL.md` 对应 `/harness-0.0-new`。
2. Codex repo skill 从 `.agents/skills/<name>/SKILL.md` 发现, 显式调用使用 `$<name>`。
3. `gh project item-edit` 支持用 `--field-id` 和 `--single-select-option-id` 修改单选字段。
4. `gh project` 至少需要 `project` scope; 缺 scope 时 Agent 不能代办浏览器授权, 只能提示用户运行授权命令。

## 关联与依赖

1. skill 分发:
   - `scripts/harness-lib.mjs` 生成 SKILL.md 内容。
   - `scripts/harness-sync.mjs` 生成 `.agents/skills/*` 和 `.claude/skills/*`。
   - `scripts/harness-check.mjs` 调用 distribution check, 因此生成逻辑错误会直接破坏 `pnpm harness:check`。
2. workflow 阶段:
   - `VERBS` 决定 workflow 源文件集合。
   - `PHASES` 和 `PHASE_RANK` 决定 `docs/works` 当前任务态可用阶段和必备产物。
3. GitHub Project:
   - `new` 阶段创建 Project item。
   - `archive` 阶段应强制同步 Done。
   - 现有 INDEX 中 Project 信息格式不统一; 新任务应收敛到 frontmatter `gh_project`。

## 验收标准

1. 核心入口、脚本、测试、模板不再引用 `opsx-*` / `/opsx` / `$opsx`。
2. `pnpm harness:sync` 生成 10 个 `harness-<action-id>` skill: 0.0-new 到 5.2-issues。
3. 旧 `.agents/skills/opsx-*`, `.claude/skills/opsx-*`, `.codex/skills/opsx-*` 和历史 `.claude/commands/opsx*` 会被 `harness:sync` 清理, 并被 `harness:check` 视为 drift。
4. `phase=polish` 被任务态校验接受, 且进入 polish 时要求 `04-POLISH.md`。
5. `polish` 只能在用户主动要求, 或复杂任务 verify 后 Agent 询问并得到同意后执行; Agent 不得自行执行。
6. `polish` 只检查当前任务范围, 默认产出建议, 不直接改代码; 用户选择修复项后才把任务退回 implement。
7. `archive` 文档要求 Project item 先同步为 Done 并复核远端状态; 同步失败时阻塞 archive。
8. 新增只读 Project 审计命令, 可检查本地任务态与远端 Project 状态漂移。
9. 相关 harness 单测覆盖前缀分发、旧产物清理、polish 阶段校验和 Project helper 逻辑。
10. 验证通过: 目标 harness 测试、`pnpm typecheck:node`, `pnpm harness:check`。

## 未决问题

无。用户已确认命名为 `harness-<action-id>` 且 Project 同步失败时 archive 应阻塞。
