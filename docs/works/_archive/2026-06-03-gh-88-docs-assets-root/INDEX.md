---
task: 2026-06-03-gh-88-docs-assets-root
task_id: GH-88
type: maintenance
phase: archive
created: 2026-06-03
priority: P2
target_date: 
maintenance:
  subtype: docs
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 1
    repaid: 2
    net: -1
    scope: module
    risk: low
    areas:
      - docs
      - tooling-ci
    confidence: medium
    rationale: "将 docs 下的站点入口和资产职责移出文档目录, 保持 README、website build 与 GitHub Pages workflow 一致。"
  final:
    incurred: 1
    repaid: 2
    net: -1
    scope: module
    risk: low
    areas:
      - docs
      - tooling-ci
    confidence: high
    rationale: "已将共享资产移到根目录 assets/, 删除旧 docs/index.html, 更新 README、website postbuild 与 GitHub Pages workflow; website build、lint、harness:check 与 Project strict 检查通过。"
  revisions: []
issue:
  number: 88
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/88
  id: I_kwDOSpnDwc8AAAABENX92w
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgukht0
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Docs Assets Root

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
