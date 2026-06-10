---
task: 2026-06-04-gh-103-unify-chart-colors
task_id: GH-103
type: maintenance
phase: implement
created: 2026-06-04
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs:
    - GH-103
debt:
  estimate:
    incurred: 3
    repaid: 2
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 校准: 新增集中配色真源 + 改 5 处使用点 (近7天费用/每日花费/token条/byModel/byProject) + 暗色模式校准 (incurred 3); 消除分散硬编码与两套并存色板 (repaid 2)。纯视觉无数据/IPC 变更, risk low。"
  final:
    incurred: 3
    repaid: 2
    net: 1
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: high
    rationale: "5 处图表使用点配色统一到 chart-colors.ts 单一真源 + globals.css 暗色段语义色板校准; 真机亮暗验收: overview/usage 费用柱单色 hsl(var(--primary))、byModel/byProject breakdown 用 --chart-1..5 语义色板、token 条蓝绿橙紫暗色自适应 (chart-1 dark=213 94% 68%); typecheck/lint/test/e2e/build 全绿 + 四态截图。"
  revisions:
    - phase: explore
      date: 2026-06-04
      from: { incurred: 2, repaid: 2, net: 0, confidence: low }
      to: { incurred: 3, repaid: 2, net: 1, confidence: medium }
      reason: "explore 定位到 5 处图表使用点 (而非 4) 与 3 处分散配色真源; 需新建集中真源并校准暗色模式, incurred/confidence 上调。"
issue:
  number: 103
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/103
  id: I_kwDOSpnDwc8AAAABEZFURA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguvQyk
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一应用内图表配色主题

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
