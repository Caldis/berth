---
task: 2026-06-19-gh-147-knip-deadcode-ci
task_id: GH-147
type: maintenance
phase: implement
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: tooling-ci
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-gh115-residuals.md
debt:
  estimate:
    incurred: 1
    repaid: 2
    net: -1
    scope: global
    risk: low
    areas:
      - tooling-ci
    confidence: low
    rationale: "knip 配置 + devDep (incurred 1); 死代码可见性 + 防再沉积 CI 基建 (repaid 2); net -1。软门禁起步零产品码改动, 本批不删码。verify 校准。"
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
  number: 147
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/147
  id: I_kwDOSpnDwc8AAAABGEAygw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgwRpxk
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# tooling: knip 死代码扫描入 CI (软门禁)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
