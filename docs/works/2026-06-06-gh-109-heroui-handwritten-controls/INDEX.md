---
task: 2026-06-06-gh-109-heroui-handwritten-controls
task_id: GH-109
type: maintenance
phase: implement
created: 2026-06-06
priority: P2
target_date: 
maintenance:
  subtype: ui-ux
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-05-IMPROVEMENT-heroui-migration-followup.md
    - GH-105
debt:
  estimate:
    incurred: 5
    repaid: 9
    net: -4
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "explore 审计校准: 确认 6 组手写控件(C1 header Input/C2 usage select/C3 hooks details 菜单/C4 共享 filter-bar select+input/C5 memory 搜索/C6 散落 Badge) + 延后 2 项(命令面板 Modal/range Slider)。范围有界但跨 layout/shared/pages, 偿还为主(去手搓控件统一 DS); incurred 来自新增 HeroUI 用法面+双 token 桥接, repaid 上调至 9。"
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
      date: 2026-06-06
      from: { incurred: 4, repaid: 6, net: -2, confidence: low }
      to: { incurred: 5, repaid: 9, net: -4, confidence: medium }
      reason: "审计确认 6 组手写控件 + 2 延后项; 范围有界但跨 layout/shared/pages, repaid 上调。"
issue:
  number: 109
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/109
  id: I_kwDOSpnDwc8AAAABEk9EZg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgu5I7w
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 审计并替换手写 UI 控件为 HeroUI 等价组件 (优先 header 搜索 input)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
