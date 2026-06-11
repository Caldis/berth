---
task: 2026-06-12-gh-121-engine-shared-core-package
task_id: GH-121
type: maintenance
phase: explore
created: 2026-06-12
priority: P1
target_date: 
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-09-IMPROVEMENT-engine-shared-core-package.md
debt:
  estimate:
    incurred: 2
    repaid: 6
    net: -4
    scope: global
    risk: high
    areas:
      - architecture
    confidence: low
    rationale: "0.0-new 初始估算: 包边界配置 (tsup/tsconfig/别名) 引入复杂度 (+2); 消灭分层倒置 + CLI 反向 import + typecheck 盲区 (-6)。30 文件物理迁移 + 全仓 import 改写触面 (worker 入口/electron.vite/e2e 产物), scope global, 等价钉测红绿网未实勘前 risk high。explore/design 后校准。"
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
  number: 121
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/121
  id: I_kwDOSpnDwc8AAAABFLneVw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvdiro
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 扫描引擎成包 (engine 物理迁包)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

把 `src/main/engine` + 依赖的 shared types/scope 提升为一等包, `src/main` 反向依赖包, 消灭 `packages/berth-scan-engine` CLI 的 `../../../` 反向相对 import 与 typecheck 盲区。用户指定重构链 ① (链首 GH-119 窗口加固已归档; 后续 ② 拆 runtime → ③ indexer 主线剩余)。

## 产物
- [x] 00-PRD.md — 原始输入快照 (来源 issue 全文)
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
