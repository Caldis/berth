---
task: 2026-06-04-gh-100-memory-tag-filter-redesign
task_id: GH-100
type: feature
phase: implement
created: 2026-06-04
priority: P2
target_date: 
source:
  kind: github-issue
  refs:
    - https://github.com/Caldis/berth/issues/100
debt:
  estimate:
    incurred: 3
    repaid: 1
    net: 2
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 校准: 改动完全落在 renderer 单文件 memory-view.tsx (+ 测试 + i18n), 无 main/preload/IPC; 重设计同时移除 FilterGroup collapsed 死分支与 renderChips 重复渲染, 故计 repaid 1。risk 由 medium 降 low (隔离、测试充分、无跨进程)。"
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
      date: 2026-06-04
      from:
        net: 3
        scope: module
        risk: medium
        confidence: low
      to:
        net: 2
        scope: module
        risk: low
        confidence: medium
      reason: "explore 确认改动仅限 renderer memory-view.tsx (+测试+i18n), 无跨进程; 重设计移除 collapsed 死分支与重复渲染计 repaid 1, risk 降 low, confidence 升 medium。"
issue:
  number: 100
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/100
  id: I_kwDOSpnDwc8AAAABEZAbkA
  state: OPEN
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguvMso
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 重新设计记忆页标签筛选组件 (消除冗余与交互问题)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
