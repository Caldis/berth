---
task: 2026-06-19-gh-145-scan-engine-nested-ignore-signature
task_id: GH-145
type: maintenance
phase: implement
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-19-IMPROVEMENT-scan-exclude-remaining-adapters-and-nested-gitignore.md
    - docs/issues/2026-06-09-IMPROVEMENT-shared-path-and-type-config.md
debt:
  estimate:
    incurred: 2
    repaid: 3
    net: -1
    scope: module
    risk: medium
    areas:
      - architecture
    confidence: low
    rationale: "嵌套 gitignore 相对化新逻辑 + search field 转义 (incurred 2); 修 search 伪相等潜在 bug + signature 习语跨 renderer/engine 统一 + gitignore per-directory 正确性 (repaid 3); maintenance net -1。explore 已证伪 #13(a) 其他 adapter 下沉 (无真项目树递归), 范围缩小; verify 后校准。"
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
  number: 145
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/145
  id: I_kwDOSpnDwc8AAAABGEAxeA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgwRpeI
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# scan-engine: 嵌套累积 gitignore (claude-code) + signature 习语收敛与 search 补转义

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
