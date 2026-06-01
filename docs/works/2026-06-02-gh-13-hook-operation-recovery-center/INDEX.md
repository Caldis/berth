---
task: 2026-06-02-gh-13-hook-operation-recovery-center
task_id: GH-13
type: feature
phase: blocked
created: 2026-06-02
issue:
  number: 13
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/13
gh_project:
  status: pending-auth
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Hook Operation Recovery Center

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

- 本地实现与验证已完成, 但 GitHub Project 绑定/归档缺少 `project,read:project` scope。需在本机运行 `gh auth refresh -h github.com -s project,read:project`, 然后执行 `node scripts/harness-projects.mjs ensure docs/works/2026-06-02-gh-13-hook-operation-recovery-center` 回写真实 `PVTI_...` item id, 再继续 archive。
