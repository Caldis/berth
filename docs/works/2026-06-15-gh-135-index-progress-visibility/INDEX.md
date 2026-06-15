---
task: 2026-06-15-gh-135-index-progress-visibility
task_id: GH-135
type: feature
phase: explore
created: 2026-06-15
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md
debt:
  estimate:
    incurred: 5
    repaid: 0
    net: 5
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: low
    rationale: "0.0-new 初估: 跨引擎 worker 进度上报 + IPC 事件 + preload + renderer 进度面板/设置/重置确认; 含暂停/取消协作式状态机与 rebuild 数据安全。explore/design 后校准。"
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
  number: 135
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/135
  id: I_kwDOSpnDwc8AAAABFdzzFg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvvL4s
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 索引引擎进度可视化与可控性 (可预期 / 可中断 / 可重置)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

母 FEATURE 切片: 本任务推进 `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` 的 OPEN 主线剩余 (T4 可暂停/可控 + 设置档位 + 可观测性深化)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
