# Polish

可选抛光阶段记录。只在用户主动要求, 或 Agent 在复杂任务 verify 后询问并得到同意时填写。

## 当前任务边界

本次只检查 harness 迁移任务本身:

- `opsx-*` 到 `harness-*` 的 skill / workflow / 文档迁移。
- `polish` 阶段的可选执行规则与任务态支持。
- GitHub Project archive gate 与只读审计。
- implement 阶段测试纪律补强。

不检查 berth 业务页面、website、i18n、并行任务目录里的具体产品改动。

## 候选项

1. 新增 `harness-projects ensure <task-dir>` 或 `start <task-dir>`。
   - 问题: archive 已有 `done` helper, 但 new 阶段仍靠 playbook 手写 `gh project item-create`、取字段 id、回写 INDEX。这里仍然容易遗漏 item_id 或写错 id。
   - 建议: 在 `scripts/harness-projects.mjs` 增加 ensure/start 命令, 创建或复用 item, 设置 Todo/In Progress, 回写 `gh_project`。
   - 影响: 高。能补齐 "new 建 item / archive 关 item" 的对称性。
   - 成本: 中。需要扩展 helper 和 `tests/harness/projects.test.ts`。
   - 是否建议进入当前任务: 建议。

2. 给 `harness:check` 增加 legacy prefix 活跃路径检查。
   - 问题: 这次迁移完整性靠手动 `rg opsx|opsw` 扫描确认。后续如果 README、模板、active works 再出现旧入口, `pnpm harness:check` 目前不会拦住。
   - 建议: 增加 active path legacy scanner, 排除 `docs/superpowers/`、`docs/works/_archive/`、`docs/friction/_archive/`、本任务历史设计记录、兼容清理测试和 `LEGACY_SKILL_PREFIXES`。
   - 影响: 中到高。能把人工扫尾变成门禁。
   - 成本: 中。要小心白名单, 避免误伤历史记录。
   - 是否建议进入当前任务: 建议。

3. 结构化检查测试纪律, 不只检查规则文字。
   - 问题: 当前 `harness:check` 只确认关键 playbook 和模板里还保留 "测试证据或明确例外理由" 这条规则, 不检查 active task 的 `03-PLAN.md` 是否真的为每个实现项写了 `tests:` / `verify:`。
   - 建议: 对 phase >= implement 的 active task 做轻量结构检查: 每个未归档 `03-PLAN.md` 的任务项应含 `tests:` 和 `verify:`; 老任务可先给 warning 或只对新模板任务启用。
   - 影响: 高。直接约束用户刚指出的测试纪律问题。
   - 成本: 中偏高。Markdown 任务项解析要保守, 需要兼容旧任务。
   - 是否建议进入当前任务: 建议, 但可以分两步: 先检查新任务, 再处理旧任务。

4. 给 `harness-3.1-polish` 的生成 skill 增加显式禁自动执行提示。
   - 问题: 当前 `SKILL.md` 内容由通用模板生成, `harness-3.1-polish` 的 description 没有直接写 "不得自动执行"。真正规则在 `.agents/workflow/3.1-polish.md`, 但 skill 列表展示时不够醒目。
   - 建议: `skillMdContent('polish')` 特判 description 和正文, 写明 "仅用户主动要求或明确同意后执行"。
   - 影响: 中。降低 Agent 误触发 polish 的风险。
   - 成本: 低。需要更新 sync 单测并跑 `pnpm harness:sync`。
   - 是否建议进入当前任务: 建议。

5. 强化 Project 审计对缺失 item_id 的处理。
   - 问题: `auditTasks()` 现在跳过没有 `gh_project.item_id` 的 active task; 对 archived task 也只有存在 item_id 时才校验状态。它能查 "已记录 item 但状态错", 但不能暴露 "任务根本没记录 Project item"。
   - 建议: 增加 `--strict` 或默认 warning, 报告 active/archive task 缺少 item_id; 对 archive gate 继续保持 hard fail。
   - 影响: 中到高。更贴合用户最初担心的 "Projects 里很多任务没完成 / 没同步"。
   - 成本: 中。需要处理历史 archived task, 避免一次性把旧账变成阻塞。
   - 是否建议进入当前任务: 建议作为后续当前任务子项, 不建议直接默认 hard fail。

6. 提供单命令 archive 包装。
   - 问题: archive 仍由 playbook 串联多个手工动作: Project Done、phase=archive、移动目录、issue 交叉引用、提交。Project gate 已脚本化, 但整个 archive 仍有手动遗漏空间。
   - 建议: 增加 `scripts/harness-5.0-archive.mjs` 或 `harness-projects archive <task-dir>` 包装核心步骤, playbook 只保留人工确认和 commit 边界。
   - 影响: 中。减少 archive 操作错误。
   - 成本: 高。涉及文件移动、issue 状态、git staging 边界, 需要更谨慎设计。
   - 是否建议进入当前任务: 不建议立刻进入; 适合单独任务。

7. 提升 Project item-list 的查找可靠性。
   - 问题: `harness-projects` 使用 `gh project item-list --limit 200`; Project 项变多后可能查不到历史 item。
   - 建议: 提高 limit, 或封装分页/多次查询策略; 错误输出中明确 "可能超过 item-list limit"。
   - 影响: 中。
   - 成本: 低到中。
   - 是否建议进入当前任务: 可选。

## 用户选择

待用户选择。建议当前任务继续做 1、2、3、4、5; 其中 6 另开任务更稳, 7 可和 5 合并处理。
