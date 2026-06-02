---
task: 2026-06-03-gh-85-local-sources-project-integration
task_id: GH-85
type: feature
phase: implement
created: 2026-06-03
priority: P2
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-IMPROVEMENT-local-sources-project-integration.md
debt:
  estimate:
    incurred: 2
    repaid: 0
    net: 2
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "Explore/Design 确认现有 assets:scan-sources 与 project-scope:candidates 已有足够契约; 本轮主要迁移 renderer 展示和测试, 不改主进程扫描契约。"
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
      date: 2026-06-03
      from:
        incurred: 4
        repaid: 0
        net: 4
        scope: cross-process
        risk: medium
        areas:
          - architecture
          - ui-ux
          - testability
        confidence: low
      to:
        incurred: 2
        repaid: 0
        net: 2
        scope: module
        risk: medium
        areas:
          - ui-ux
          - testability
        confidence: medium
      reason: "现有 ProjectScopeCandidate、ScanRoot 与 assets:scan-sources 已覆盖项目来源展示所需字段; 不需要新增 IPC 或扫描器数据契约。"
issue:
  number: 85
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/85
  id: I_kwDOSpnDwc8AAAABEK1dJQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiZCA
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Local Sources Project Integration

任务索引与交接锚。phase 字段为唯一状态源, harness-0.1-continue 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
