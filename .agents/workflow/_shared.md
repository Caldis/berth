# Workflow 共享契约

被 `.agents/workflow/*.md` 各 verb 引用。定义命名、状态契约、阶段门禁。

## 任务标识

以 Jira ID 为可选主键。任务目录命名 `{YYYY-MM-DD}[-{JIRA}]-{SUMMARY}`:
- `2026-05-29-SPFOODY-63829-order-notes` (有 Jira)
- `2026-05-29-cold-start-crash` (无 Jira)

SUMMARY 为 kebab-case。任务目录位于 `docs/works/`。

## INDEX.md 状态契约

每个任务目录含 `INDEX.md`, 顶部 YAML frontmatter 为唯一状态源:

```yaml
---
task: 2026-05-29-SPFOODY-63829-order-notes
type: feature          # feature | bug
jira: SPFOODY-63829    # 可选
phase: explore         # explore | design | implement | verify | blocked | archive
created: 2026-05-29
artifacts:
  source: 00-PRD.md    # feature: 00-PRD.md; bug: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---
```

`phase` 表示任务当前所处阶段, 即 `opsx-continue` 将续跑的步骤。

## 阶段门禁

| phase | 必备产物 | 下一步 |
|---|---|---|
| explore | source | design |
| design | source + 01-ANALYSIS | implement 或 blocked |
| implement | source + 01-ANALYSIS + 02-SPEC + 03-PLAN | verify |
| verify | 同 implement | archive 或 退回 implement |
| blocked | source + 01-ANALYSIS | 人工澄清后回 design |
| archive | 全部 | 移入 docs/works/_archive |

## 不变量

1. 阶段间只靠 INDEX.md 与产物文件交接, 不靠会话记忆。
2. PRD/BUG 快照 (00-*) 为只读输入, 任何阶段不回写。
3. design 遇 PRD 级歧义 → phase 置 blocked 并在 INDEX 标注待澄清项, 不进 implement。
4. verify 不通过项回写 03-PLAN.md 新任务, phase 退回 implement。
5. 工程摩擦不就地处理, 沉到 docs/friction/{YYYYMMDD}-{phase}-{summary}.md。
6. 用户在任务过程中给出的纠正/意见/偏好, 一经验证有效, 必须主动沉淀为 friction 并当轮落地优化, 无需用户提示。遇到已验证的工具链 workaround、环境/截图/进程类问题也一样处理; 不等最终复盘或用户追问。沉淀产物本身须先过 `pnpm harness:check` 才能提交 (phase 段限 8 个 verb: new|continue|explore|design|implement|verify|archive|optimization)。
7. 用户提出流程改善意见时, 先判断是否为代价非常小的修正; 若是, 先询问用户是落到 friction 并改规则, 还是只作为当前会话行为校准直接调整。
8. 小改动豁免前必须先声明豁免依据并征得用户确认。确认前不得直接跳过 `opsx-new`; 若实施中发现影响面超出声明范围, 停下重新申请或切入 harness。
9. 执行当前任务时发现已验证的产品 bug、功能缺口或改进项, 且不属于当前主线验收范围, 必须主动写入 `docs/issues/{YYYY-MM-DD}-{BUG|FEATURE|IMPROVEMENT}-{summary}.md`; 当前任务产物只保留交叉引用, 不把旁支问题混入当前实现, 除非用户明确扩大任务范围。
10. 已验证、边界清楚的增量应尽可能频繁提交; 每次提交前只暂存自己相关文件, 用 `git diff --cached` 核对 staged 集合, 不提交无关工作区改动。

## 工具

可用工具索引见 `.agents/tools.md`。项目地图见 `docs/ARCHITECTURE.md`。
