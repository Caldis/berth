---
task: 2026-06-05-gh-105-radix-to-heroui-redesign
task_id: GH-105
type: feature
phase: explore
created: 2026-06-05
priority: P1
target_date: 
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 13
    repaid: 5
    net: 8
    scope: global
    risk: high
    areas:
      - ui-ux
      - architecture
      - dependency
    confidence: low
    rationale: "0.0-new 初始估算; 整库迁移 shadcn(Radix 10 包/~266 处)→ HeroUI, 涉及 theme provider、Tailwind plugin、组件 API 全替换与全应用视觉重构, incurred 高; 设计系统沉淀与一致性提升偿还部分 ui-ux debt。explore/design 后必校准并追加 revisions。"
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
  number: 105
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/105
  id: I_kwDOSpnDwc8AAAABEaD41g
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguwIPw
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Radix UI → HeroUI 整库重构: 设计系统统一、主题/强调色增强、过渡动画补全

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
