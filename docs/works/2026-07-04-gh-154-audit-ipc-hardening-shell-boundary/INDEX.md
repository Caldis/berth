---
task: 2026-07-04-gh-154-audit-ipc-hardening-shell-boundary
task_id: GH-154
type: bug
phase: explore
created: 2026-07-04
priority: P2
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-07-04-IMPROVEMENT-audit-remaining-batches-ipc-hardening-and-p3.md
    - GH-151
    - GH-152
    - GH-153
debt:
  estimate:
    incurred: 3
    repaid: 3
    net: 0
    scope: cross-process
    risk: medium
    areas:
      - architecture
    confidence: low
    rationale: "七项 (输入为耐久清单, 无行号证据, explore 需全量核实): 机制四项 (typed registerHandler/typed emit/sender 校验/双向对账) 是类型层与测试层加固, incurred 为新契约推导机制; 偿还编译期类型漂移与 mock 单向对账盲区。shell 两项 (realpath/scheme 白名单) 为安全正确性小修。正则加固面未知 (grep 后定量)。scope=cross-process (main/preload/renderer 类型链 + 契约表); risk=medium (registerHandler 泛型化触所有 handler 签名, 但行为不变纯类型层)。confidence=low — 待 explore 核实各项现状后校准。"
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
  number: 154
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/154
  id: I_kwDOSpnDwc8AAAABHp1F4w
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
  item_id: PVTI_lAHOADXbEs4BZHvQzgxu25Q
  item_status: In Progress
---

# 综合审查修复批次四: IPC 机制加固 + shell 边界七项

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (issues 清单条目 1-7 + 范围裁定)
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 待澄清 (blocked 时填)
