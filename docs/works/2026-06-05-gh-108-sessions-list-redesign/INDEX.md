---
task: 2026-06-05-gh-108-sessions-list-redesign
task_id: GH-108
type: feature
phase: implement
created: 2026-06-05
priority: P2
target_date: 
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 4
    repaid: 2
    net: 2
    scope: module
    risk: low
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 校准: react-virtuoso 官方确认零配置可变行高, 行高风险解除; DS 层 @/components/ui 已 re-export 全套 HeroUI, 组件即用; 本机样本佐证 skillsUsed ~65% / mcpServers 高有值率, 数据值得展示。incurred=4 (HeroUI 化 SessionRow + 1-2 小展示组件 + token 细分可视化 + i18n); repaid=2 (收敛手写 agent badge/model chip 到语义 Chip, 接续 GH-105)。net=2, scope=module 纯 renderer 无 IPC/main 改动。"
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
      from: { risk: medium, confidence: low, net: 2 }
      to: { risk: low, confidence: medium, net: 2 }
      reason: "虚拟列表可变行高经 react-virtuoso 官方文档确认 (风险解除); DS 层 HeroUI 组件全部就绪; 本机样本验证 skills ~65% / mcp 高有值率。net 不变, risk medium→low, confidence low→medium。"
issue:
  number: 108
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/108
  id: I_kwDOSpnDwc8AAAABEe-VLw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgu0guY
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 会话列表重设计: HeroUI 组件化 + 可视化更多有效数据 + 提升易用性

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
