---
task: 2026-06-16-gh-136-unify-collapsible-motion
task_id: GH-136
type: maintenance
phase: implement
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
    incurred: 3
    repaid: 6
    net: -3
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "design 校准: 范围全量 (新 Collapsible primitive + 8 迁移点, 含 TagFilter 通用容器 + 2 处 HeroUI motionProps 对齐); incurred 2->3, net 仍偿还为主。"
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
    - phase: design
      date: 2026-06-16
      from:
        scope: "6 处收敛"
        incurred: 2
      to:
        scope: "全量: 新 primitive + 8 迁移点 (含 TagFilter + 2 HeroUI)"
        incurred: 3
      reason: "用户拍板范围扩为全量统一 (TagFilter 纳入通用容器 + HeroUI 侧对齐 MOTION token); incurred 2->3, net 不变。"
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
- [x] 02-SPEC.md — Design 产物 (Collapsible primitive + 8 迁移点 + 测试矩阵)
- [x] 03-PLAN.md — 活任务清单 (T1-T7)
- [ ] 04-POLISH.md — 可选抛光记录

## 交接提示 (多设备续跑)
- 下一步: `harness-3.0-implement` (phase=implement)。
- 范围已拍板 (全量): 共享 `<Collapsible>` (ui 层, grid-rows 提炼自 NoteCard) + 6 卡片折叠收敛 + TagFilter 纳入 + HeroUI 侧 (teams/PluginCard) 对齐 MOTION token。
- 实现顺序: T1 (共享组件) 先; T2/T3/T4/T5 (各文件迁移) 可并行; T6 (HeroUI 对齐) 依赖 T3; T7 (CDP 真跑验收) 最后。详见 03-PLAN。

## 待澄清 (blocked 时填)
(无)
