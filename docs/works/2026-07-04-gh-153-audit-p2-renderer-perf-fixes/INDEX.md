---
task: 2026-07-04-gh-153-audit-p2-renderer-perf-fixes
task_id: GH-153
type: bug
phase: design
created: 2026-07-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - GH-151
    - GH-152
debt:
  estimate:
    incurred: 2
    repaid: 3
    net: -1
    scope: module
    risk: medium
    areas:
      - performance
      - architecture
    confidence: medium
    rationale: "九项渲染层修复 (证据 = 2026-07-04 审查渲染层子报告, 快照见 00-BUG): 多为局部小修 (原子 selector/push/deferredFilter/吞错 setError/MOTION token), 中等三项 (usage.summary 去重+costMode 复用、health force 绕在途、session-detail keyed CachedResource)。incurred: CachedResource 扩展 (force 语义/keyed detail) 新代码; repaid: 消除 5 路同参重 IPC、usage 页复制粘贴 DRY 违规、O(n²) 分组、布局根全量订阅。scope=module (全部在 src/renderer, 不动 main/IPC 契约); risk=medium (use-ipc.ts 是全页面共享热路径)。confidence=medium, explore 核实 CachedResource 语义后校准。"
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
  number: 153
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/153
  id: I_kwDOSpnDwc8AAAABHppvtA
  state: OPEN
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgxusGU
  item_status: In Progress
---

# 综合审查修复批次三 (P2 渲染层): usage 取数去重复用 / 订阅粒度 / 分组复杂度 / 吞错与动效 token 九项

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (渲染层审查子报告全文 + 本批范围标注)
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
