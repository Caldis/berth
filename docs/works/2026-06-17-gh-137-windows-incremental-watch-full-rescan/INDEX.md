---
task: 2026-06-17-gh-137-windows-incremental-watch-full-rescan
task_id: GH-137
type: bug
phase: verify
created: 2026-06-17
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-16-BUG-windows-incremental-watch-full-rescan.md
debt:
  estimate:
    incurred: 1
    repaid: 0
    net: 1
    scope: file
    risk: low
    areas:
      - testability
    confidence: high
    rationale: "explore 实机定位: 非 windows 产品 bug, 而是 e2e 未等首扫 commit 的时序缺陷 (before.id 捕获到 'initial')。修复仅改单一 e2e 文件, 不动产品代码。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions:
    - phase: explore
      date: 2026-06-17
      from: { scope: module, risk: medium, areas: [architecture], net: 2 }
      to: { scope: file, risk: low, areas: [testability], net: 1 }
      reason: "实机证伪 issue 的产品根因候选 (derive null / inferScope sep); 真因是 e2e 未等首扫 commit 的时序缺陷, 改动收窄到单一 e2e 文件。"
issue:
  number: 137
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/137
  id: I_kwDOSpnDwc8AAAABFrR5Yw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgv7lg8
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# GH-137 Windows skill 文件变更走全量重扫而非增量折叠

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物 (真因: e2e 时序缺陷, 非产品 bug)
- [x] 02-SPEC.md — Design 产物 (纯测试修复; AC5 丢弃为冗余)
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
