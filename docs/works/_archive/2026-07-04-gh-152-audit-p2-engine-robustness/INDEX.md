---
task: 2026-07-04-gh-152-audit-p2-engine-robustness
task_id: GH-152
type: bug
phase: archive
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
    incurred: 3
    repaid: 5
    net: -2
    scope: module
    risk: medium
    areas:
      - architecture
      - performance
      - tooling-ci
    confidence: high
    rationale: "T1-T8 共 8 个实现提交 + 1 个 CI 修复提交。与 estimate 差异: repaid 4→5 (verify 期间顺带机制性修复 prepush 门禁测试面盲区 — 补 test:scan-engine 任务, tooling-ci 类偿还; T8 渲染层 unsupported 呈现补全)。测试: 先红后绿为主 (T2 为 characterization, 已记偏差), 根级 187 文件 + 包内 17 文件 + renderer 533 用例全绿; 真机 CDP 设置面板点开态截图验收通过。剩余风险: search-signature 语义已按新契约重钉。"
  revisions:
    - phase: design
      date: 2026-07-04
      field: confidence
      from: medium
      to: high
      reason: "explore 逐点归类 catch 集群 (8 记账/12 豁免) 并锁定 B2 判脏键为数组引用相等 (snapshot.id 会漏增量变更); design 落定 D1-D4 裁决与 T1-T7 拆解, 无 IPC/renderer 改动。数值与 scope/risk 不变。"
    - phase: verify
      date: 2026-07-04
      field: repaid/net/areas
      from: "4/-1, [architecture, performance]"
      to: "5/-2, +tooling-ci"
      reason: "verify 实测发现 T3 渲染缺口 (T8 补) 与 CI 红根因 (根门禁缺包内套件) — 后者以 prepush 补闸机制性修复, 属 tooling-ci 偿还; friction 已记。"
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
  item_status: Done
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
