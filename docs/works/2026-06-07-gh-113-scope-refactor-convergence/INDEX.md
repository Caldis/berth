---
task: 2026-06-07-gh-113-scope-refactor-convergence
task_id: GH-113
type: feature
phase: explore
created: 2026-06-07
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/113
debt:
  estimate:
    incurred: 10
    repaid: 4
    net: 6
    scope: cross-process
    risk: high
    areas:
      - architecture
      - performance
    confidence: low
    rationale: "0.0-new 初始估算: 重定义三档 scope 语义 (全局=全设备所有项目+用户+企业, 需扫会话派生现存项目目录 → 性能) + 收敛分散 scope 逻辑到统一模块 + 修跨适配器同一物理文件重复扫描 (AGENTS.md)。跨 scanner/runtime/shared scope/switcher, scope=cross-process, risk high。Codex 两轮 review 守护。explore/design 后校准。"
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
  number: 113
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/113
  id: I_kwDOSpnDwc8AAAABEpvbRA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgu9T4I
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Scope 特性重构 + 模块收敛 + 去重扫描 (GH-113)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

目标 (常规用户心智): 全局=设备上所有可扫描资产 (所有项目+用户+企业); 用户域=项目外公共/用户级; 项目域=保持现状。收敛分散 scope 逻辑到统一模块; 修复同一物理文件被多适配器重复扫描 (AGENTS.md)。流程同 GH-111 (Codex 两轮交叉 review)。审查记录见 `review/`。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
