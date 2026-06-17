---
task: 2026-06-17-gh-139-e2e-window-controls-teardown-flaky-macos
task_id: GH-139
type: bug
phase: explore
created: 2026-06-17
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-11-BUG-e2e-window-controls-teardown-flaky-macos.md
debt:
  estimate:
    incurred: 1
    repaid: 0
    net: 1
    scope: file
    risk: low
    areas:
      - testability
    confidence: high
    rationale: "单文件 e2e 修复: 非 win32 不启 app + 守卫 afterEach close。根因已在来源 issue + 本机分析钉死, 改动面小。"
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
  number: 139
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/139
  id: I_kwDOSpnDwc8AAAABFzxrgA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwDU_U
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# GH-139 macOS CI e2e window-controls teardown flaky

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
