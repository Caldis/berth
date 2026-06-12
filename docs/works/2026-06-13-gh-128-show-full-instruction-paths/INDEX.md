---
task: 2026-06-13-gh-128-show-full-instruction-paths
task_id: GH-128
type: bug
phase: verify
created: 2026-06-13
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/128
debt:
  estimate:
    incurred: 1
    repaid: 0
    net: 1
    scope: module
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "Explore 确认根因在约定页 conventions 卡片折叠态同时使用 truncatePath 文本省略和 CSS truncate; 影响面为 renderer 单页展示和页面测试。"
  final:
    incurred: 1
    repaid: 1
    net: 0
    scope: module
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: high
    rationale: "最终 diff 限定在约定页 conventions 卡片折叠态和 renderer 测试; 完整路径直接渲染并用 break-all 换行, 不再使用 truncatePath 或 CSS truncate。"
  revisions:
    - phase: explore
      date: 2026-06-13
      from:
        confidence: low
      to:
        confidence: medium
      reason: "已定位到 instructions conventions 卡片折叠态, 不需要改变共享 truncatePath 或跨 IPC 契约。"
issue:
  number: 128
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/128
  id: I_kwDOSpnDwc8AAAABFURGXA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvlEow
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 完整显示指令路径

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
