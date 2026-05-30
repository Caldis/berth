---
task: 2026-05-30-home-overview-session-list
type: bug
jira:
phase: verify
created: 2026-05-30
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# Home Overview Session List

任务索引与交接锚。phase 字段为唯一状态源, `opsx-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)

无阻塞项。本轮按保守策略处理 cost: session JSONL 没有稳定 cost 字段时显示未知, 不在没有价格表和官方 billing 数据的情况下伪造 `$0.00` 或自行估算。

## GitHub Project

- project: berth (#6)
- item: PVTI_lAHOADXbEs4BZHvQzguPiC0
- status: Todo
