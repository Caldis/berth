---
task: 2026-07-04-gh-152-audit-p2-engine-robustness
task_id: GH-152
type: bug
phase: implement
created: 2026-07-04
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - GH-151
debt:
  estimate:
    incurred: 3
    repaid: 4
    net: -1
    scope: module
    risk: medium
    areas:
      - architecture
      - performance
    confidence: high
    rationale: "八项 P2 修复 (证据经审查+源码复核, 见 00-BUG): 多为局部小修 (NUL 转义/seed/节流/supported 标注), 中等两项 (MiniSearch 判脏、吞错集群逐判 8 记账/12 豁免), 结构两项 (store close 契约、getDb 瞬态重试)。incurred: close 契约与判脏改造新代码; repaid: 消除每查询 O(全库) 签名、吞错违规、WAL 常驻、安慰剂设置失信。scope=module (无 IPC/renderer 改动); risk=medium (无调度状态机改动)。design 锁定 (T1-T7 + D1-D4 裁决) 后 confidence 升 high。"
  final:
    incurred:
    repaid:
    net:
    scope:
    risk:
    areas: []
    confidence:
    rationale:
  revisions:
    - phase: design
      date: 2026-07-04
      field: confidence
      from: medium
      to: high
      reason: "explore 逐点归类 catch 集群 (8 记账/12 豁免) 并锁定 B2 判脏键为数组引用相等 (snapshot.id 会漏增量变更); design 落定 D1-D4 裁决与 T1-T7 拆解, 无 IPC/renderer 改动。数值与 scope/risk 不变。"
issue:
  number: 152
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/152
  id: I_kwDOSpnDwc8AAAABHomjIw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgxt1ao
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 综合审查修复批次二 (P2): 引擎/主进程健壮性与性能小修八项

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (P2 八项 + file:line 证据)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物 (T1-T7 + D1-D4 裁决)
- [x] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
