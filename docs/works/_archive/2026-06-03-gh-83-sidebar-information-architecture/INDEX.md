---
task: 2026-06-03-gh-83-sidebar-information-architecture
task_id: GH-83
type: feature
phase: archive
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-FEATURE-sidebar-information-architecture.md
debt:
  estimate:
    incurred: 5
    repaid: 0
    net: 5
    scope: global
    risk: high
    areas:
      - architecture
      - ui-ux
      - testability
    confidence: medium
    rationale: "0.0-new 初始估算; 侧边栏信息架构会影响全局导航、页面内 tab、agent 视角入口和多页面路由, explore/design 后校准。"
  final:
    incurred: 5
    repaid: 3
    net: 2
    scope: global
    risk: medium
    areas:
      - architecture
      - ui-ux
      - testability
    confidence: high
    rationale: "完成全局导航拆分、旧路径兼容、搜索跳转、renderer 测试和 e2e 更新; 剩余风险主要是后续页面继续迁移时的视觉一致性。"
  revisions:
    - at: 2026-06-03
      phase: explore
      from:
        confidence: low
      to:
        confidence: medium
      rationale: "Explore 确认变更集中在 renderer 导航、路由、i18n 与测试, 不涉及 IPC 或主进程; 风险仍是 global/high, 但边界更清楚。"
    - at: 2026-06-03
      phase: verify
      from:
        net: 5
        risk: high
        confidence: medium
      to:
        net: 2
        risk: medium
        confidence: high
      rationale: "本地 lint/typecheck/full test/harness、目标 e2e、Electron CDP 视觉检查和当前 SHA GitHub CI 均已通过。"
issue:
  number: 83
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/83
  id: I_kwDOSpnDwc8AAAABEK1aMg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiY0s
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Sidebar Information Architecture

任务索引与交接锚。phase 字段为唯一状态源, harness-0.1-continue 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
