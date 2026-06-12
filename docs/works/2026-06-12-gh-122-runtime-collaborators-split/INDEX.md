---
task: 2026-06-12-gh-122-runtime-collaborators-split
task_id: GH-122
type: maintenance
phase: explore
created: 2026-06-12
priority: P1
target_date: 
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-09-IMPROVEMENT-asset-runtime-collaborators-split.md
debt:
  estimate:
    incurred: 2
    repaid: 5
    net: -3
    scope: module
    risk: high
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算: 三协作者新模块边界 (+2), 消解上帝对象单一依赖/整体 mock 困境 (-5)。改动集中包内 engine/assets 域 (scope module), 但 runtime 是全部 IPC 读路径单一依赖且有快照 ID 稳定/scope 无重扫两条行为硬约束, 重构期 risk high。explore/design 后校准。"
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
  number: 122
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/122
  id: I_kwDOSpnDwc8AAAABFPsouw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvg2FQ
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# AgentAssetRuntime 拆协作者 (链 ②)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

在 `@berth/scan-engine` 包内把 runtime 上帝对象拆为 SelectorCache / ProjectSnapshotCache / ScanCoordinator + 状态机编排壳; 行为零变更 (快照 ID 稳定 + scope 无重扫语义)。用户重构链 ② (① GH-121 已归档; ③ indexer 主线以 ScanCoordinator 为落点)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
