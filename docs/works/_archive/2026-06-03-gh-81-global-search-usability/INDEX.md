---
task: 2026-06-03-gh-81-global-search-usability
task_id: GH-81
type: bug
phase: archive
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-BUG-global-search-usability.md
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: cross-process
    risk: high
    areas:
      - architecture
      - testability
      - ui-ux
    confidence: medium
    rationale: "Explore/Design 后校准; 已确认问题集中在 renderer 搜索弹窗未接 IPC、main 搜索索引字段过窄、assets:search 未确保扫描与索引准备。"
  final:
    incurred: 4
    repaid: 3
    net: 1
    scope: cross-process
    risk: low
    areas:
      - architecture
      - testability
      - ui-ux
    confidence: high
    rationale: "已补全 main 搜索元数据索引、索引 freshness、assets:search ensureScanned、preload 类型、renderer 搜索结果/状态/键盘交互和自动化测试。剩余 net=1 来自 raw 全文搜索未纳入当前任务, 未来如需要应单独设计敏感内容边界。"
  revisions:
    - phase: explore
      date: 2026-06-03
      from:
        confidence: low
      to:
        confidence: medium
      reason: "已审计 renderer/preload/main 搜索链路和测试覆盖, 影响范围明确。"
issue:
  number: 81
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/81
  id: I_kwDOSpnDwc8AAAABEKnnzw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiNLQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Global Search Usability

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
