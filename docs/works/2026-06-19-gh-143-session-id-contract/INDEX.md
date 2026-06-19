---
task: 2026-06-19-gh-143-session-id-contract
task_id: GH-143
type: maintenance
phase: design
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-session-id-contract.md
debt:
  estimate:
    incurred: 1
    repaid: 3
    net: -2
    scope: module
    risk: medium
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算: sessionAssetId 单点函数 + codex onMalformed 记账 + agent-teams 改调用 (incurred 少); 消除 id 隐式契约风险 + codex 数据质量对等 (repaid); maintenance 降 debt net -2; explore/design 后校准。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions: []
issue:
  number: 143
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/143
  id: I_kwDOSpnDwc8AAAABGA_oGw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwO3Nc
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# session-id 契约: codex 坏行记账对等 + sessionAssetId 单点函数

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
