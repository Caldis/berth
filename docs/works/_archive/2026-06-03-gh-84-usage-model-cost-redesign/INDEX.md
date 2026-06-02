---
task: 2026-06-03-gh-84-usage-model-cost-redesign
task_id: GH-84
type: feature
phase: archive
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-FEATURE-usage-model-cost-redesign.md
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "Explore 确认 usage 数据契约已包含费用来源、模型明细、价格缺口和口径字段; 本轮实现可收在 renderer/i18n/tests, 保持 IPC 兼容。"
  final:
    incurred: 2
    repaid: 1
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: high
    rationale: "最终只改 Usage renderer、i18n 和 renderer 测试; 移除旧空区域并把费用来源、计价模式和模型明细收进同一页面结构, 目标测试、prepush、build、CI 和截图验收均通过。"
  revisions:
    - phase: explore
      date: 2026-06-03
      from:
        incurred: 5
        repaid: 0
        net: 5
        scope: cross-process
        risk: high
        areas:
          - architecture
          - testability
          - ui-ux
        confidence: low
      to:
        incurred: 3
        repaid: 0
        net: 3
        scope: module
        risk: medium
        areas:
          - ui-ux
          - testability
        confidence: medium
      reason: "主进程汇总和共享类型已具备关键字段; GH-84 只需要调整 Usage renderer 信息结构、文案和测试。"
    - phase: verify
      date: 2026-06-03
      from:
        incurred: 3
        repaid: 0
        net: 3
        scope: module
        risk: medium
        areas:
          - ui-ux
          - testability
        confidence: medium
      to:
        incurred: 2
        repaid: 1
        net: 1
        scope: module
        risk: low
        areas:
          - ui-ux
          - testability
        confidence: high
      reason: "实现没有触碰 IPC 或主进程数据契约; renderer 测试扩大覆盖并删除 rate limits / experimental flags 过时展示, 剩余风险低于设计初估。"
issue:
  number: 84
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/84
  id: I_kwDOSpnDwc8AAAABEK1bBA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiY68
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Usage Model Cost Redesign

任务索引与交接锚。phase 字段为唯一状态源, harness-0.1-continue 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
