---
task: 2026-06-16-gh-136-unify-collapsible-motion
task_id: GH-136
type: maintenance
phase: design
created: 2026-06-16
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: user-request
  refs:
    - GH-136
debt:
  estimate:
    incurred: 2
    repaid: 5
    net: -3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 收口校准: 影响面经符号边界精判为 6 处/4 文件; 方案反转为提炼已有 grid-rows 范本 (零新依赖); net 方向不变。"
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
      date: 2026-06-16
      from:
        blast: "11 files / 13 spots (grep 子串粗筛)"
        confidence: low
        approach: "framer-motion 新造 Collapsible"
      to:
        blast: "6 spots / 4 files (符号边界 JSX 使用点)"
        confidence: medium
        approach: "提炼 memory-view 已有 grid-rows 折叠范本"
      reason: "1.0-explore 一手核实: memory-view NoteCard/TagFilter 已是生产级 grid-rows 折叠实现, instructions/capabilities 手写折叠为其退化版; grep 粗筛虚高影响面 (friction 20260606-heroui-migration)。"
issue:
  number: 136
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/136
  id: I_kwDOSpnDwc8AAAABFpGvhw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgv5_mA
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 统一折叠/手风琴组件: 抽共享 Collapsible 原语

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (user-request)
- [x] 01-ANALYSIS.md — Explore 产物 (已收口: 官方文档验证 + 符号边界 blast radius + 方案反转)
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 交接提示 (多设备续跑)
- 下一步: `harness-2.0-design` (phase=design)。
- explore 收口结论: 影响面 6 处/4 文件 (符号边界); 方案反转 — 提炼 memory-view 已有 grid-rows 折叠范本为共享 `<Collapsible>` (非 framer-motion 新造); HeroUI 侧仅对齐 MOTION token。
- design 待拍板: 任务范围 = 全部 6 处收敛 vs 最小验证切片 (见 01-ANALYSIS §11 未决问题 1)。

## 待澄清 (blocked 时填)
(无)
