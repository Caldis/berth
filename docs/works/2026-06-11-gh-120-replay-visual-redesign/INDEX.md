---
task: 2026-06-11-gh-120-replay-visual-redesign
task_id: GH-120
type: feature
phase: design
created: 2026-06-11
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/120
debt:
  estimate:
    incurred: 6
    repaid: 2
    net: 4
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 核实: 影响面限 renderer sessions 模块 + lib/replay-model + 测试; 若 design 采纳 adapter 层中断标志则升 cross-process (加可选字段, 低风险)。估算维持 6/2/4。"
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
  number: 120
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/120
  id: I_kwDOSpnDwc8AAAABFKuiwA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvcm10
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 重放模块视觉与交互重设计

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

聚焦 [会话] 详情页 [重放] 模块的视觉效果设计与交互: 事件主题色系统、筛选器图标化 (Check 左置)、Canvas 高性能时间轴 (滚轮缩放 / 拖曳导航 / window 视口区域 / 等待与中断样式 / 选中框选高亮)、右侧面板宽度拖曳 + 全屏 + 导出。设计方法参考 frontend-design (用户显式调用)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
