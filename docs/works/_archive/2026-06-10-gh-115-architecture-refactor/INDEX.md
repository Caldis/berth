---
task: 2026-06-10-gh-115-architecture-refactor
task_id: GH-115
type: maintenance
phase: archive
created: 2026-06-10
priority: P1
target_date: 
maintenance:
  subtype: architecture
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 3
    repaid: 12
    net: -9
    scope: global
    risk: high
    areas:
      - architecture
    confidence: medium
    rationale: "explore 校准: ULTRACODE 分析实测 34 项问题 (high 10) / 6 主题 / 20 项已验证孤儿; 预计偿还引擎域/IPC 契约/渲染层复用/孤儿四条主线 (architecture area debt 27 的主要部分); 批次多且触及契约/打包配置, incurred 上调至 3。"
  final:
    incurred: 3
    repaid: 12
    net: -9
    scope: global
    risk: medium
    areas:
      - architecture
    confidence: high
    rationale: "T0-T14 全部落地 (IPC 单源/引擎域收敛/孤儿清除/可观测性/i18n/打包面), 14 批小步提交 CI 全绿; verify 真机四场景 (项目切换无丢失/坏配置错误链 1.2s 双向/skill watch 链 1.0s/会话详情 modelInfo+timeline) + 6 页亮暗截图 + 双语冒烟全通过; deferred 14 项全数立案; risk 由 high 降 medium (行为保持已实证)。"
  revisions:
    - phase: implement
      date: 2026-06-10
      from: "confidence medium"
      to: "confidence high (T0-T14 全部落地, 14 批小步提交, CI 全绿)"
      reason: "实施完成度核实: 主题 1-5 核心项全落地 + 主题 6 的 R6/R7; deferred 14 项全部显式立案/增补 (9 新立 + 4 增补 + 2 旁支)。repaid 12 估算由实际批次支撑。"
    - phase: explore
      date: 2026-06-10
      from: "incurred 2 / repaid 8 / net -6 / confidence low"
      to: "incurred 3 / repaid 12 / net -9 / confidence medium"
      reason: "ULTRACODE 全量分析落地: 106 findings → 34 问题 (high 10) + 20 已验证孤儿, 影响面与可偿还量均高于初估; 触及 IPC/打包契约使 churn 风险上调。"
issue:
  number: 115
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/115
  id: I_kwDOSpnDwc8AAAABE9btMw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvQfWo
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# 架构全面分析与重构: 分层边界、复用收敛、孤儿代码清理

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物 (34 问题 / 6 主题 / 20 孤儿 / 11 风险, 证据见 assets/)
- [x] 02-SPEC.md — Design 产物 (多宿主端口-适配器 + 派生单源契约; panel 裁决见 assets/design-panel.json)
- [x] 03-PLAN.md — 活任务清单 (T0-T14 顺序执行)

## 待澄清 (blocked 时填)
