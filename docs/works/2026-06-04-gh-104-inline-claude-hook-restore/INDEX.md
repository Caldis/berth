---
task: 2026-06-04-gh-104-inline-claude-hook-restore
task_id: GH-104
type: feature
phase: verify
created: 2026-06-04
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/104
debt:
  estimate:
    incurred: 4
    repaid: 2
    net: 2
    scope: module
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: medium
    rationale: "0.0-new 初始估算; 删除集中恢复中心, 保留 Claude Code sidecar 作为内部状态, 统一右侧 Hook 行内启停体验。影响 renderer hooks 页面、Claude/Codex Hook 状态说明、IPC 暴露与测试。"
  final:
    incurred: 2
    repaid: 5
    net: -3
    scope: module
    risk: low
    areas:
      - ui-ux
      - architecture
      - testability
    confidence: high
    rationale: "最终实现保留 sidecar 作为内部禁用状态, 删除恢复中心 UI/IPC/preload/shared types/i18n/test mock, 并让 Claude disabled Hook 复用原 Hook 行内启用按钮。新增 scanner 边界处理与行内恢复测试, API 面和用户路径都更少。"
  revisions:
    - phase: verify
      date: 2026-06-04
      from: { incurred: 4, repaid: 2, net: 2, risk: medium, confidence: medium }
      to: { incurred: 2, repaid: 5, net: -3, risk: low, confidence: high }
      reason: "实现后确认无需保留集中恢复 surface; 删除旧 UI/API 与专用测试后, 只保留 sidecar 内部状态和原行恢复路径, 代码与用户路径均收窄。"
issue:
  number: 104
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/104
  id: I_kwDOSpnDwc8AAAABEZJiPg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvUhs
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Inline Claude hook restore

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
