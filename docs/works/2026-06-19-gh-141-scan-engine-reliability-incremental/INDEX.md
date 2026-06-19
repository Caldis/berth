---
task: 2026-06-19-gh-141-scan-engine-reliability-incremental
task_id: GH-141
type: maintenance
phase: implement
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-18-BUG-scan-helper-exits-code-0-mid-scan.md
    - docs/issues/2026-06-18-IMPROVEMENT-watcher-full-rescan-on-session-write.md
debt:
  estimate:
    incurred: 4
    repaid: 6
    net: -2
    scope: cross-process
    risk: medium
    areas:
      - architecture
    confidence: medium
    rationale: "explore 校准: 根因1 = Electron utilityProcess packaged child script 完即退出 (#42978 确证, 修复 keep-alive); 根因2 = session 增量 (GH-113 未实现 slice, 需补 sourceKey + claude/codex dispatch)。session 比初估复杂 incurred+1, 偿还面更大 repaid+1。"
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
      date: 2026-06-19
      reason: "根因确证 (helper = Electron packaged child 退出 #42978; session = GH-113 未实现增量 slice + sourceKey 缺口)。session 增量比初估复杂, incurred 3→4, repaid 5→6, confidence low→medium。"
issue:
  number: 141
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/141
  id: I_kwDOSpnDwc8AAAABF_sGsQ
  state: OPEN
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwNlWo
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# scan 引擎机制修复: helper 过早退出 + session 全量重扫

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (2 个 docs/issues)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
