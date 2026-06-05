---
task: 2026-06-05-gh-106-accent-global-theme
task_id: GH-106
type: feature
phase: explore
created: 2026-06-05
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - GH-105
debt:
  estimate:
    incurred: 5
    repaid: 1
    net: 4
    scope: global
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: low
    rationale: "0.0-new 初估: accent 从局部 --primary 升级为全 UI 主题色, 需把 --accent/sidebar 等中性 token 接入 picker 驱动 + 新增中性黑默认 + 多组件适配 + 浅/深双主题逐页验收; incurred 来自全局主题驱动复杂度与维护面扩大, repaid 来自纠正 GH-105 accent 语义错位。explore/design 后校准。"
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
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
