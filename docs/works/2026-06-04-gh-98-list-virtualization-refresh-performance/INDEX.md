---
task: 2026-06-04-gh-98-list-virtualization-refresh-performance
task_id: GH-98
type: maintenance
phase: verify
created: 2026-06-04
priority: P2
target_date: 
maintenance:
  subtype: performance
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-04-IMPROVEMENT-sessions-list-virtualization.md
    - https://github.com/Caldis/berth/issues/98
debt:
  estimate:
    incurred: 5
    repaid: 12
    net: -7
    scope: global
    risk: high
    areas:
      - performance
      - ui-ux
      - architecture
      - testability
    confidence: medium
    rationale: "0.0-new 初始估算: 跨 Sessions、Memories、Instructions 列表基础设施、第三方依赖、刷新限流和搜索性能; design 后维持估算。"
  final:
    incurred: 6
    repaid: 17
    net: -11
    scope: global
    risk: medium
    areas:
      - performance
      - ui-ux
      - architecture
      - testability
    confidence: high
    rationale: "引入成熟虚拟列表与类目导航依赖, 建 shared virtual list 基础设施并迁移 Sessions/Memories/Instructions; 增加 TTL/in-flight/diff 刷新策略与覆盖测试; Sessions 项目类目新增父目录聚合、根目录置顶与完整路径 title。剩余风险主要是真实 Electron 800-row fixture 未在本阶段新增。"
  revisions:
    - phase: verify
      date: 2026-06-04
      from:
        incurred: 5
        repaid: 12
        net: -7
        risk: high
        confidence: medium
      to:
        incurred: 6
        repaid: 16
        net: -10
        risk: medium
        confidence: high
      reason: "实现后新增测试与依赖成本略高, 但 Sessions/Memories/Instructions 共享基础设施、刷新限流与大列表测试覆盖降低了后续性能与测试风险。"
    - phase: verify
      date: 2026-06-04
      from:
        incurred: 6
        repaid: 16
        net: -10
        risk: medium
        confidence: high
      to:
        incurred: 6
        repaid: 17
        net: -11
        risk: medium
        confidence: high
      reason: "根据用户对 Sessions 左侧类目体验的反馈, 新增父目录聚合、根目录置顶、短标签与完整路径 title 测试覆盖。"
issue:
  number: 98
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/98
  id: I_kwDOSpnDwc8AAAABEUxGww
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgurPJY
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Improve large list virtualization and refresh performance

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
