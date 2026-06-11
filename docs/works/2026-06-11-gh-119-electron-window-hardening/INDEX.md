---
task: 2026-06-11-gh-119-electron-window-hardening
task_id: GH-119
type: maintenance
phase: explore
created: 2026-06-11
priority: P1
target_date: 
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-electron-window-hardening.md
debt:
  estimate:
    incurred: 1
    repaid: 4
    net: -3
    scope: cross-process
    risk: medium
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算: url-guard 单点新模块小幅复杂度 (+1), 消灭 sandbox 回退/出口直通/导航裸奔/权限全放行分散风险 (-4); sandbox:true 涉 preload 打包与 renderer 行为, scope cross-process, 真机验证前 risk medium。explore/design 后校准。"
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
  number: 119
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/119
  id: I_kwDOSpnDwc8AAAABFKk6RA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvcfLI
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Electron 窗口装配层安全加固

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

defense-in-depth 一批落地: sandbox:true + preload exclude 打包、`main/url-guard.ts` 出口校验单点 (openExternal 协议白名单 / openPath 扫描根集合 / setWindowOpenHandler 共用)、will-navigate 守卫、permission handler deny-all、CSP 次级指令补齐。

## 产物
- [x] 00-PRD.md — 原始输入快照 (来源 issue 全文)
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
