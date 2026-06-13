---
task: 2026-06-13-gh-131-scan-engine-indexer-settings-plugins
task_id: GH-131
type: feature
phase: design
created: 2026-06-13
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md
debt:
  estimate:
    incurred: 8
    repaid: 6
    net: 2
    scope: global
    risk: high
    areas:
      - architecture
      - performance
      - ui-ux
      - testability
    confidence: low
    rationale: "0.0-new 初始估算; 扫描引擎后台索引化、统一设置入口和插件接口会增加全局接口面, 但同时偿还现有 scanAll / scope 重扫 / adapter 直连债。explore/design 后校准。"
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
  number: 131
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/131
  id: I_kwDOSpnDwc8AAAABFWc0-g
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvmrG8
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 扫描引擎后台索引、统一设置入口和插件适配架构

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
