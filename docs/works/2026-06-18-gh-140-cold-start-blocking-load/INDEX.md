---
task: 2026-06-18-gh-140-cold-start-blocking-load
task_id: GH-140
type: bug
phase: verify
created: 2026-06-18
priority: P1
target_date:
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 3
    repaid: 1
    net: 2
    scope: cross-process
    risk: medium
    areas:
      - performance
    confidence: medium
    rationale: "explore 校准: 直接根因 = ensureReady 在 stale 状态阻塞全量 scan (SWR 失效, 静态确证); 等待时长由 968 session 全量 parse + OS throttle 决定。核心修复为单方法语义 + 测试, 修正既有设计缺陷计小幅偿还。"
  final:
    incurred: 2
    repaid: 1
    net: 1
    scope: cross-process
    risk: low
    areas:
      - performance
    confidence: high
    rationale: "实际单方法修复 (ensureReady stale 分支); 真跑确认 SWR (insights 21ms vs 改前 28.8s, 冷启动首屏秒显)。45+1237 单测绿。根因B 首扫 36.3s 成本未动 (转后台不阻塞首屏), 留 issue。"
  revisions:
    - phase: explore
      date: 2026-06-18
      reason: "根因定位为 ensureReady stale 分支阻塞 (单方法修复), 范围比初估收敛; 修正设计缺陷计 repaid 1。net 4→2, confidence low→medium。"
    - phase: verify
      date: 2026-06-19
      reason: "真跑验证后定稿: net 2→1 (改动仅单方法), risk medium→low (45+1237 单测 + CDP 真跑时序双验), confidence medium→high。"
issue:
  number: 140
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/140
  id: I_kwDOSpnDwc8AAAABF6Sf7w
  state: OPEN
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwI3Fc
  item_status: In Progress
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 冷启动首屏被顶部 loading 阻塞 (30s-1min)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
