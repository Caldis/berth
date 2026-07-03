---
task: 2026-07-04-gh-151-scan-engine-audit-fixes
task_id: GH-151
type: bug
phase: design
created: 2026-07-04
priority: P1
target_date:
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 5
    repaid: 4
    net: 1
    scope: cross-process
    risk: high
    areas:
      - architecture
      - performance
    confidence: medium
    rationale: "0.0-new 初始估算。六项修复 (P0 x3 + P1 x3) 已由 5 维度审查 + 主 Agent 逐条源码复核实锤 (file:line 证据在 00-BUG.md), 故 confidence 起点 medium 而非 low。incurred: watchdog/latest-wins 队列/replaceBySourceKey 增量写均为新机制代码; repaid: 消除调度死区、全库重写热路径、IPC 全量 raw 负载, 偿还 architecture+performance 债。scope=cross-process (engine pkg + src/main helper 链路 + renderer hooks); risk=high (触碰 runtime 调度状态机与持久层)。explore/design 后校准。"
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
  number: 151
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/151
  id: I_kwDOSpnDwc8AAAABHmcjqA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgxsAUM
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 综合审查修复批次: 扫描引擎调度死区 / respectGitignore 失效 / 看门狗缺失 + 增量持久化与 IPC 负载

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (审查报告 P0/P1 六项 + file:line 证据)
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
