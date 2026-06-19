---
task: 2026-06-20-gh-148-session-streaming-parse
task_id: GH-148
type: maintenance
phase: implement
created: 2026-06-20
priority: P2
target_date:
maintenance:
  subtype: performance
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-07-IMPROVEMENT-session-streaming-parse.md
debt:
  estimate:
    incurred: 4
    repaid: 3
    net: 1
    scope: module
    risk: high
    areas:
      - performance
    confidence: low
    rationale: "流式逐行解析重写 + replay LRU (incurred 4, 改 session 解析核心 + 行为不变风险高); 降大 transcript (59/120MB) 内存/CPU 峰值 (repaid 3, 性能债); net +1 (新复杂度略增)。worker 下沉范围 explore 后定 (可能 defer 为更大 work)。explore/design 校准。"
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
  number: 148
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/148
  id: I_kwDOSpnDwc8AAAABGEWkmQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgwR5QE
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# session-streaming-parse: JSONL 流式解析 + replay 缓存逐出 降大 transcript 内存/CPU 峰值

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
