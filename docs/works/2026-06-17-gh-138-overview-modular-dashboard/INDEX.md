---
task: 2026-06-17-gh-138-overview-modular-dashboard
task_id: GH-138
type: feature
phase: verify
created: 2026-06-17
priority: P2
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/138
debt:
  estimate:
    incurred: 16
    repaid: 0
    net: 16
    scope: cross-process
    risk: high
    areas:
      - ui-ux
      - architecture
    confidence: medium
    rationale: "0.0-new 初始估算; 三轮累积为模块化可拖拽/可缩放/可持久化的 widget 仪表盘系统 + 多 widget 数据聚合 (可能新增 IPC 选择器, 四方对账) + 健康检查弹窗 + onboarding。架构 (widget 注册表/布局引擎/配置持久化/复用契约) 与 ui-ux 双重负债; 性能为硬约束。explore 后校准 scope/incurred (DnD 网格库可得性 + 现有 session/token 聚合复用度)。"
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
      date: 2026-06-17
      from: "incurred 14 / net 14 / confidence low"
      to: "incurred 16 / net 16 / confidence medium"
      reason: "explore 确认 cross-process 后端工作量 (~5 新 insights IPC 通道 + engine 聚合 + 可能 scanner 扩展 + DnD 库集成 + widget framework + localStorage 持久化); 现状已摸清, confidence 升 medium, 唯一大未知为 RGL React 19 实测。"
issue:
  number: 138
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/138
  id: I_kwDOSpnDwc8AAAABFwcwMQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwALMM
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 重构首页总览为模块化可拖拽自定义仪表盘

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

目标: 把 Overview 从固定平铺区块重构为模块化、可拖拽/可缩放/完全自定义、配置可持久化的 widget 仪表盘; 提供多形态可视化小组件 (指标卡 / 活动热力图 / 活动洞察 / 排行榜等), 健康检查收拢弹窗, 强化 onboarding; 高性能、高可维护、可复用可扩展; 高品位审美交付。详见 00-PRD.md。

## 产物
- [x] 00-PRD.md — 原始输入快照 (三轮需求累积)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
