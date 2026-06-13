---
task: 2026-06-13-gh-133-fill-website-content-empty-surfaces
task_id: GH-133
type: feature
phase: implement
created: 2026-06-13
priority: P1
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/133
debt:
  estimate:
    incurred: 4
    repaid: 5
    net: -1
    scope: module
    risk: medium
    areas:
      - ui-ux
      - docs
      - testability
    confidence: medium
    rationale: "Explore 校准; 代码变更主要限制在 website 包的路由、页面组件、内容集合、多语言 JSON、SEO/llms/postbuild 测试面。任务会增加内容和少量页面逻辑, 但能偿还官网入口浅、产品事实滞后、扫描引擎和 adapter 能力未表达、404 fallback 不正确等内容债。"
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
    - stage: explore
      date: 2026-06-13
      from:
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
      to:
        incurred: 4
        repaid: 5
        net: -1
        scope: module
        risk: medium
        areas:
          - ui-ux
          - docs
          - testability
        confidence: medium
      reason: "完整扫描确认实现面主要在 website 包, 不需要改 Electron 主进程或扫描引擎; 主要收益是补齐官网内容、入口和静态路由质量。"
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
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
