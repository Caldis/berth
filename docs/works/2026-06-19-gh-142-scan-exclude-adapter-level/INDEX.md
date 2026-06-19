---
task: 2026-06-19-gh-142-scan-exclude-adapter-level
task_id: GH-142
type: maintenance
phase: design
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: performance
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-15-IMPROVEMENT-scan-exclude-adapter-level.md
debt:
  estimate:
    incurred: 3
    repaid: 3
    net: 0
    scope: module
    risk: medium
    areas:
      - performance
      - dependency
    confidence: medium
    rationale: "explore 校准: 跨 worker 边界新增字段 + adapter 双改 + 新增 ignore 依赖 + gitignore matcher 模块, incurred 2→3; repaid 保持 (消除结果后过滤低效 + 修 respectGitignore no-op); net 0。"
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
      date: 2026-06-19
      from: "incurred 2 / net -1 / areas [performance]"
      to: "incurred 3 / net 0 / areas [performance, dependency]"
      reason: "跨进程新增字段 + adapter 双改 + 新增 ignore 依赖 + gitignore matcher 模块, incurred 上调。"
issue:
  number: 142
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/142
  id: I_kwDOSpnDwc8AAAABGApjhA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgwOjRY
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# scan: 扫描排除下沉 adapter 枚举层 + respectGitignore 接入

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
