---
task: 2026-06-03-gh-93-harness-verification-flow
task_id: GH-93
type: maintenance
phase: verify
created: 2026-06-03
priority: P2
target_date: 
maintenance:
  subtype: tooling-ci
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/93
debt:
  estimate:
    incurred: 1
    repaid: 4
    net: -3
    scope: module
    risk: medium
    areas:
      - tooling-ci
      - testability
    confidence: medium
    rationale: "0.0-new 初始估算; 优化 harness prepush 与 Project 检查范围, 目标是减少验证重复耗时并修复 Windows 工具链不稳定。"
  final:
    incurred: 1
    repaid: 4
    net: -3
    scope: module
    risk: medium
    areas:
      - tooling-ci
      - testability
    confidence: medium
    rationale: "修复 Windows prepush pnpm.cmd 启动问题并新增当前 work Project check 模式; macOS/Linux prepush 保持 direct spawn pnpm。"
  revisions: []
issue:
  number: 93
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/93
  id: I_kwDOSpnDwc8AAAABERBgow
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguoB6o
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Optimize harness verification flow

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
