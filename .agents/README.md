# .agents — AI Native Workflow Harness

berth 的 Agent 工作流单一真源, 同时服务 Claude Code 与 Codex。

## 结构

- `workflow/` — 流程 playbook (唯一真源, 手写)
  - `_shared.md` 门禁与状态契约; 10 个有序 action 各一份。
- `skills/harness-<action-id>/SKILL.md` — 薄指针 (由 `pnpm harness:sync` 生成, 勿手改)。
- `tools.md` — 可用工具索引。
- `references/` — 一手事实参考 (如 ai-tool-command-distribution.md: 双工具命令分发的官方核实结论)。

## 分发

`pnpm harness:sync` 幂等生成:
- `.agents/skills/harness-<action-id>/SKILL.md`
- `.claude/skills/harness-<action-id>` 软链或目录副本 (Claude Code 由 skill 提供 `/harness-<action-id>` 并可按 description 自动触发)
- Codex 原生读取 `.agents/skills`, 不再分发 `.codex/skills`
- 历史生成的旧 commands 与旧前缀 skills 会被清理; Claude Code 官方已将 custom commands 合并进 skills

`pnpm harness:check` 校验产物/模板/命名/分发。CI 强制。

## 任务 ID

active work 使用 GitHub Issue number 作为可读主键: `task_id: GH-{number}`。目录固定为 `docs/works/{date}-gh-{number}-{summary}/`; `gh_project.item_id` 只作为 Project 状态同步句柄。

## 调用

- Claude Code: `/harness-<action-id>` (由 `.claude/skills/harness-<action-id>/SKILL.md` 提供, 也可自动触发)
- Codex: `$harness-<action-id>` (skill)

action: 0.0-new · 0.1-continue · 0.2-sync · 1.0-explore · 2.0-design · 3.0-implement · 3.1-polish · 4.0-verify · 5.0-archive · 5.1-friction · 5.2-issues

## 何时进入

- feature / bug / maintenance 开发任务: 落代码前必须用 `harness-0.0-new` 建任务态, 禁止跳过直接实现或调试。
- 小改动 (单行/拼写/纯文案注释, 或单一文件·单一关注点·门禁即可验收的小改动如数值调整、局部 UI 微调、弃用 API 替换) 可直接处理 + 跑门禁, 不建任务态。若用户已明确给出目的、范围或具体参数, 或明确要求 "不走 harness / 直接调整", Agent 直接声明按小改动处理并执行, 不再二次询问。若是 Agent 自行判断小改动豁免, 必须先声明豁免依据并征得用户确认。
- 存疑默认走 harness; 进行中的任务用 `harness-0.1-continue` 续跑。多设备 / 多 Agent 协作: 在另一设备推进过同一任务后切回本机, 先用 `harness-0.2-sync` 拉取对齐 + 增量交接再续跑。

## Task Type 与 Debt

- `type`: `feature | bug | maintenance`。maintenance 需填写 subtype: `ui-ux | performance | architecture | testability | tooling-ci | dependency | docs`。
- `source.kind`: `user-request | github-issue | docs-issues | docs-friction | ci | harness`。`issue` 与 `friction` 是来源, 不作为 subtype。
- `debt.estimate` 从 new 开始填写, explore/design/implement 持续修正; 重要变化写入 `debt.revisions[]`。
- `debt.final` 在 verify/archive 前填写。`pnpm harness:stats` 汇总 debt pool: `<20 ok`, `>=20 notice`, `>=40 recommend-maintenance`, `>=60 requires-override`。
- maintenance 自动选择: `harness:stats` 达到维护阈值时输出 `maintenance=<subtype>:<score>`。平局优先级为 `tooling-ci > ui-ux > testability > performance > dependency > docs > architecture`; `architecture` 只有自身 area debt `>=40` 时自动选择。
- GitHub Project 使用自定义字段同步 Task Type、Priority、日期、debt、scope、risk、source; 当前用户仓库不写真实 GitHub Issue Type。

## 阶段

Explore → Design → Implementation → Verify。Verify 后可选 Polish, Archive 只在用户确认任务完成后执行。
Polish 只在用户主动要求, 或 Agent 对复杂任务先询问并得到同意后执行; Agent 不得自行进入。
Archive 必须先把 GitHub Project item 置为 Done 并回读确认, 失败则停止归档。
状态见各任务 `docs/works/{task}/INDEX.md`; 摩擦见 `docs/friction/`; 产品问题见 `docs/issues/`。
Archive 后提醒本次产生或关联的 friction / issues; 用户可选运行 `harness-5.1-friction` 或 `harness-5.2-issues`, Agent 不自动执行。

## 观测

`pnpm harness:stats` 输出 works 阶段分布、friction/issues 数量、debt pool 状态和分发状态。
