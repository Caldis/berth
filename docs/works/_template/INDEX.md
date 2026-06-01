---
task: {YYYY-MM-DD}-gh-{ISSUE_NUMBER}-{SUMMARY}
task_id: GH-{ISSUE_NUMBER}
type: feature
phase: explore
created: {YYYY-MM-DD}
issue:
  number: {ISSUE_NUMBER}
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/{ISSUE_NUMBER}
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: {PROJECT_ITEM_ID}
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# {任务标题}

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [ ] 00-PRD.md / 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
