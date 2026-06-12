---
task: 2026-06-12-gh-122-runtime-collaborators-split
task_id: GH-122
type: maintenance
phase: implement
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
    confidence: medium
    rationale: "explore 校准 (2026-06-12): 591 行职责块行级映射完成, SelectorCache 已半成 (独立类未出文件), 24 用例红绿网现成且覆盖全部六不变量, 消费面窄接口先例 — 拆分为内部协作者公共 API 零变更。数值维持 2/5/-3, scope module / risk high 维持 (写回边界 Q1 未定)。"
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
      date: 2026-06-12
      from: "confidence low"
      to: "confidence medium"
      reason: "职责块行级映射 + 24 用例红绿网现成 + 公共 API 零变更判据落定; 数值与 scope/risk 维持。"
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
- [x] 01-ANALYSIS.md — Explore 产物 (职责块行级映射 + 六不变量 + 24 用例红绿网 + AC1-6)
- [x] 02-SPEC.md — Design 产物 (B 案 coordinator 契约 + 六不变量承接表 + 测试矩阵)
- [x] 03-PLAN.md — 活任务清单 (T1-T4 顺序)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
