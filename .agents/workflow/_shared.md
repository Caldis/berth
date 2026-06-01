# Workflow 共享契约

被 `.agents/workflow/*.md` 各 action 引用。定义命名、状态契约、阶段门禁。

## 最高优先级规则

已验证、边界清楚的增量必须小步频繁提交。完成一个可独立验证的子步骤并通过对应检查后, 立即只暂存自己相关文件、用 `git diff --cached` 核对 staged 集合、提交一次。不得把多个已完成阶段长时间堆在工作区最后一次性提交; archive / 收尾提交不能替代 implementation 过程中的小步提交。若因为风险或依赖关系不能提交, 必须在当轮说明阻塞原因。

## 任务标识

以 GitHub Issue number 作为可读主键。任务 ID 固定为 `GH-{issue_number}`, 任务目录命名 `{YYYY-MM-DD}-gh-{issue_number}-{SUMMARY}`:
- `2026-06-01-gh-123-order-notes`
- `2026-06-01-gh-124-cold-start-crash`

SUMMARY 为 kebab-case。任务目录位于 `docs/works/`。`issue.number` 是人工可读主键; `gh_project.item_id` 是脚本同步 Project 状态用的 GraphQL node id, 不能互换。

## INDEX.md 状态契约

每个任务目录含 `INDEX.md`, 顶部 YAML frontmatter 为唯一状态源:

```yaml
---
task: 2026-06-01-gh-123-order-notes
task_id: GH-123
type: feature          # feature | bug
phase: explore         # explore | design | implement | verify | polish | blocked | archive
created: 2026-06-01
issue:
  number: 123
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/123
gh_project:
  status: tracked
  project_id: PVT_xxx
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_xxx
  item_status: In Progress
artifacts:
  source: 00-PRD.md    # feature: 00-PRD.md; bug: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md # 可选, 仅 polish 阶段需要
---
```

`phase` 表示任务当前所处阶段, 即 `harness-0.1-continue` 将续跑的步骤。action id 只用于 workflow 文件、skill 名和 friction 命名, 不替代 `INDEX.phase`。

## Action ID

| action | 性质 |
|---|---|
| 0.0-new | 创建任务态 |
| 0.1-continue | 续跑当前 phase |
| 1.0-explore | explore 阶段 |
| 2.0-design | design 阶段 |
| 3.0-implement | implement 阶段 |
| 3.1-polish | 可选 implement 子步骤 |
| 4.0-verify | verify 阶段 |
| 5.0-archive | archive 阶段 |
| 5.1-optimization | 可选归档后 friction 收敛 |
| 5.2-issues | 可选归档后 issue 收敛 |

## 阶段门禁

| phase | 必备产物 | 下一步 |
|---|---|---|
| explore | source | design |
| design | source + 01-ANALYSIS | implement 或 blocked |
| implement | source + 01-ANALYSIS + 02-SPEC + 03-PLAN | verify |
| verify | 同 implement | polish、archive 或退回 implement |
| polish | 同 verify + 04-POLISH | archive、verify 或退回 implement |
| blocked | source + 01-ANALYSIS | 人工澄清后回 design |
| archive | 全部 | 移入 docs/works/_archive |

## 不变量

1. 阶段间只靠 INDEX.md 与产物文件交接, 不靠会话记忆。
2. PRD/BUG 快照 (00-*) 为只读输入, 任何阶段不回写。
3. design 遇 PRD 级歧义 → phase 置 blocked 并在 INDEX 标注待澄清项, 不进 implement。
4. verify 不通过项回写 03-PLAN.md 新任务, phase 退回 implement。
5. 工程摩擦不就地处理, 沉到 docs/friction/{YYYYMMDD}-{action-id}-{summary}.md。
6. 用户在任务过程中给出的纠正/意见/偏好, 一经验证有效, 必须主动沉淀为 friction 并当轮改进规则, 无需用户提示。遇到已验证的工具链 workaround、环境/截图/进程类问题也一样处理; 不等最终复盘或用户追问。沉淀产物本身须先过 `pnpm harness:check` 才能提交 (action 段限 10 个值: 0.0-new|0.1-continue|1.0-explore|2.0-design|3.0-implement|3.1-polish|4.0-verify|5.0-archive|5.1-optimization|5.2-issues)。
7. 用户提出流程改善意见时, 先判断是否为代价非常小的修正; 若是, 先询问用户是落到 friction 并改规则, 还是只作为当前会话行为校准直接调整。
8. 小改动豁免前必须先声明豁免依据并征得用户确认。确认前不得直接跳过 `harness-0.0-new`; 若实施中发现影响面超出声明范围, 停下重新申请或切入 harness。
9. 涉及外部产品/平台/SDK/CLI 的功能行为、字段契约、费用口径、配置选项、文件格式、指标含义等可能随版本变化的内容时, Explore / Design 阶段必须先用英文检索官方文档或 primary source, 再写判断和方案; 官方无公开契约时, 才可使用本机样本作为 fallback, 并在产物中明确标注其经验性。
10. 执行当前任务时发现已验证的产品 bug、功能缺口或改进项, 且不属于当前主线验收范围, 必须主动写入 `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`; 当前任务产物只保留交叉引用, 不把旁支问题混入当前实现, 除非用户明确扩大任务范围。
11. 已验证、边界清楚的增量必须小步频繁提交; 每次提交前只暂存自己相关文件, 用 `git diff --cached` 核对 staged 集合, 不提交无关工作区改动。
12. Polish 是可选阶段, 只能由用户主动要求, 或 Agent 在复杂任务 verify 通过后询问并取得明确同意后进入。Polish 只检查当前任务相关的深挖、修复、交互、视觉、可用性、适用性与性能问题, 不扩大范围。
13. Active work 必须记录 `task_id`、`issue.number`、`issue.url` 和 `gh_project.item_id`。旧归档任务可保留历史企业 ticket 字段, 但 active works 不再新增这类字段。
14. Archive 前必须同步 GitHub Project: 运行 `node scripts/harness-projects.mjs done <task-dir>`, 将 item 状态置 Done 并回读确认; 失败、缺授权或缺 `gh_project.item_id` 时停止 archive, 不移动目录。GitHub Issue 是否关闭由 PR closing keyword 或用户明确要求决定, archive 不默认关闭 Issue。
15. 测试不是 verify 阶段补跑。Design 必须写测试策略和测试矩阵; Implement 每个实现项必须先写或更新目标测试, 跑目标测试通过后才可勾选。确实不适合自动化测试时, 必须在 03-PLAN 写清 `tests: not needed - <reason>` 和替代验证。每个实现项必须有测试证据或明确例外理由。
16. 默认流程是 harness workflow。只有用户明确要求使用 Superpowers 流程时, Superpowers 才能接管流程; 否则只把 Superpowers 当作方法库。
17. 进入 harness 后, Superpowers 只能作为方法参考: 不创建 active `docs/superpowers/plans` 或 `docs/superpowers/specs`, 不要求 worktree, 不覆盖 INDEX.phase, 不把 `writing-plans` / `executing-plans` 的流程问答注入当前任务。所有 spec / plan 输出都写入当前 work 的 `02-SPEC.md` / `03-PLAN.md`。
18. Agent 自主判断并行或顺序执行。文件不重叠、模块边界清楚、测试可独立运行时可并行; 同一批文件反复修改、测试强耦合、任务依赖前一步结果、或涉及全局迁移/状态机/脚本入口时顺序执行。不得把 subagent 并行或主 session 执行作为用户选择题。
19. Archive 后必须提醒本次产生或关联的 friction / issues, 并给出可选下一步: `harness-5.1-optimization` 处理 friction, `harness-5.2-issues` 处理 docs/issues。提醒不等于自动执行, 未经用户要求不得进入这两个可选动作。

## 工具

可用工具索引见 `.agents/tools.md`。项目地图见 `docs/ARCHITECTURE.md`。
