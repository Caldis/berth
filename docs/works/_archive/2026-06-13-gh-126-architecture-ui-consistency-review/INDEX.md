---
task: 2026-06-13-gh-126-architecture-ui-consistency-review
task_id: GH-126
type: maintenance
maintenance:
  subtype: architecture
phase: archive
created: 2026-06-13
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/126
debt:
  estimate:
    incurred: 2
    repaid: 7
    net: -5
    scope: global
    risk: medium
    areas:
      - architecture
      - ui-ux
      - testability
      - performance
    confidence: medium
    rationale: "T1 已收敛筛选类 Select 视觉契约, T3 已把 ProjectScopeSwitcher 的 store/IPC/snapshot 副作用收进内部 hook。PageChrome builder 候选因当前收益偏浅暂缓。"
  final:
    incurred: 2
    repaid: 7
    net: -5
    scope: global
    risk: low
    areas:
      - architecture
      - ui-ux
      - testability
    confidence: high
    rationale: "完成两个小步: 1) 新增 FilterSelect, 统一会话/能力/用量/回放筛选 Select 的密集视觉契约; 2) 将 ProjectScopeSwitcher 的候选加载、scope IPC、project activation、asset snapshot 和 store 写入顺序收进 useProjectScopeActions。PageChrome builder 候选评估后暂缓, 因当前只做 helper 会过浅。本地 lint/typecheck/test/harness 全绿, CI run 27433383973 三平台成功, agent-owned Electron 实测会话筛选高度 36px 且项目范围 user/global 切换正常。"
  revisions:
    - phase: explore
      date: 2026-06-13
      from: { confidence: low }
      to: { confidence: medium }
      reason: "已完成 renderer/UI 调用点审计, 候选收敛为 FilterSelect、PageChrome builder、ProjectScope hook 三类; 第一类可小步实现并测试。"
    - phase: implement
      date: 2026-06-13
      from: { repaid: 6, net: -4 }
      to: { repaid: 7, net: -5 }
      reason: "除 FilterSelect 外, 又完成 ProjectScopeSwitcher 副作用 hook 抽取, 减少 UI render 对 store/IPC/snapshot 写入顺序的直接依赖。"
issue:
  number: 126
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/126
  id: I_kwDOSpnDwc8AAAABFT24pw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvksW4
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 架构与 UI 一致性审计优化

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
