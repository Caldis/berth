---
task: 2026-06-12-gh-121-engine-shared-core-package
task_id: GH-121
type: maintenance
phase: verify
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
    confidence: medium
    rationale: "explore 校准 (2026-06-12): 真实闭包 53 文件 (engine 27+adapters 21+adapter-registry+中立件 4, issue 30 系低估), 但消费面实测小 (main 6 文件 17 行 + tests 40 文件 ~50 行 + 配置 ~6 处); engine 零 electron import 实证; 机制全有仓内先例 (@shared 源码 alias/externalize exclude/等价钉测)。盲区实证升级: CLI 三核心文件因包 tsconfig exclude 处于全局零 typecheck。数值维持 2/6/-4, scope global risk high 维持。"
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
      date: 2026-06-12
      from: "confidence low"
      to: "confidence medium"
      reason: "闭包/消费面/构建触点全部实测 (53 文件闭包 vs 估 30, 改写面反而小), 机制全有仓内先例; 数值与 scope/risk 维持。"
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
- [x] 01-ANALYSIS.md — Explore 产物 (闭包 53 实测 + 盲区实证升级 + AC1-8)
- [x] 02-SPEC.md — Design 产物 (Q1-Q4 定稿: A1 进包/平移/深路径 alias/root 纳管; 解析配置契约 + 测试矩阵)
- [x] 03-PLAN.md — 活任务清单 (B1-B4 顺序)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
