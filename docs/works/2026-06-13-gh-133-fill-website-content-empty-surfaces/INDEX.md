---
task: 2026-06-13-gh-133-fill-website-content-empty-surfaces
task_id: GH-133
type: feature
phase: explore
created: 2026-06-13
priority: P1
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/133
debt:
  estimate:
    incurred: 5
    repaid: 2
    net: 3
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
      - docs
      - testability
    confidence: low
    rationale: "0.0-new 初始估算; 官网内容填充会跨 website 路由、内容集合、多语言、SEO 和验证脚本, 同时偿还当前官网入口空白、产品说明滞后和近期扫描引擎能力未表达的内容债。explore/design 后校准。"
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
  number: 133
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/133
  id: I_kwDOSpnDwc8AAAABFXthyg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvn5uw
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 官网内容填充与空入口补齐

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
