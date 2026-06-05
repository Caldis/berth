---
task: 2026-06-05-gh-106-accent-global-theme
task_id: GH-106
type: feature
phase: verify
created: 2026-06-05
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - GH-105
debt:
  estimate:
    incurred: 4
    repaid: 2
    net: 2
    scope: module
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: medium
    rationale: "explore 校准: 核心是把误用 --accent 的选中态/启用态改用 --primary (已被 picker 驱动) + 新增中性黑 accent 设默认, 改动集中 ~6-10 处语义修正 + 1 个 data-accent 块, 非全局 token 接入; repaid 上调因偿还 GH-105 选中态语义错位的 ui-ux 债。"
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
    - phase: explore
      date: 2026-06-05
      from: { incurred: 5, repaid: 1, net: 4, scope: global, confidence: low }
      to: { incurred: 4, repaid: 2, net: 2, scope: module, confidence: medium }
      reason: "盘点确认改动集中于选中态语义修正 (~6-10 处), 远小于全局 token 接入初判; repaid 上调因偿还 GH-105 误用 --accent 的语义债。"
issue:
  number: 106
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/106
  id: I_kwDOSpnDwc8AAAABEdE4JQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguyvXU
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Accent color 升级为全局主题色: 新增中性黑默认, 切换全 UI 生效

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入 + 方向确认快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
