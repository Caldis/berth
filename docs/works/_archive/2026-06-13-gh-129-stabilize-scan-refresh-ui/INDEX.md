---
task: 2026-06-13-gh-129-stabilize-scan-refresh-ui
task_id: GH-129
type: bug
phase: archive
created: 2026-06-13
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/129
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: cross-process
    risk: high
    areas:
      - ui-ux
      - performance
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算; 现象涉及后台扫描调度、assets 更新事件、renderer SWR/列表稳定性和性能开销, 需 Explore 后校准。"
  final:
    incurred: 1
    repaid: 4
    net: -3
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
      - performance
      - architecture
    confidence: medium
    rationale: "新增 runtime scheduled refresh 和 renderer stale 守卫带来少量状态机复杂度; 同时修复后台扫描 partial 覆盖完整快照的闪烁, 并把高频 watcher fallback full refresh 合并限频, 降低 UI 抖动与后台扫描开销。"
  revisions: []
issue:
  number: 129
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/129
  id: I_kwDOSpnDwc8AAAABFUdTaw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvlOUY
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 稳定扫描刷新期间的 UI

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
