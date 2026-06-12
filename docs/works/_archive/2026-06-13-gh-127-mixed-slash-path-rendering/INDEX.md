---
task: 2026-06-13-gh-127-mixed-slash-path-rendering
task_id: GH-127
type: bug
phase: archive
created: 2026-06-13
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/127
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
    rationale: "Explore 确认根因在 renderer 共享 truncatePath 固定用 / 拼接截断路径; 影响面为共享显示 helper 和页面测试, 不跨 IPC。"
  final:
    incurred: 1
    repaid: 0
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: high
    rationale: "共享 truncatePath 已按 Windows/POSIX/UNC 路径补测试并修复; instructions 页面折叠/展开一致性有 renderer test, 本地 lint/typecheck/test、真实应用截图、CI 均通过。"
  revisions:
    - phase: explore
      date: 2026-06-13
      from:
        confidence: low
      to:
        confidence: medium
      reason: "已定位到 renderer 共享 helper, 影响面清楚, 但涉及多页面消费所以风险仍为 medium。"
    - phase: verify
      date: 2026-06-13
      from:
        net: 2
        risk: medium
        confidence: medium
      to:
        net: 1
        risk: low
        confidence: high
      reason: "最终 diff 局限在 renderer 共享显示 helper 和两组测试; 全量本地门禁、真实界面验收和 CI 均通过。"
issue:
  number: 127
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/127
  id: I_kwDOSpnDwc8AAAABFUGkBg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvk6WM
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 路径展示斜杠混用

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
