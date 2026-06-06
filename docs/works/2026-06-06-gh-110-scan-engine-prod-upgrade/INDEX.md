---
task: 2026-06-06-gh-110-scan-engine-prod-upgrade
task_id: GH-110
type: feature
phase: implement
created: 2026-06-06
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/110
    - docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md
    - docs/issues/2026-06-05-IMPROVEMENT-session-error-channel.md
    - docs/issues/2026-06-04-IMPROVEMENT-sessions-list-virtualization.md
    - docs/issues/2026-06-05-IMPROVEMENT-heroui-migration-followup.md
debt:
  estimate:
    incurred: 13
    repaid: 4
    net: 9
    scope: global
    risk: high
    areas:
      - architecture
      - performance
      - tooling-ci
    confidence: medium
    rationale: "扫描引擎 + 适配器 + Scope runtime + IPC + 渲染层全链路升级, 收敛核心模块 (repay architecture); 叠加引擎提取为独立可发布包 + CLI 表面 + 多消费端, scope=global, 含 tooling-ci。design 实测提取仅 4 文件 Electron 耦合 + 节奏定 hybrid (先建 CLI/E2E 闭环再增量迁移) 降低风险, confidence low→medium。"
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
      from: { incurred: 8, repaid: 3, net: 5, scope: cross-process, areas: [architecture, performance] }
      to: { incurred: 13, repaid: 4, net: 9, scope: global, areas: [architecture, performance, tooling-ci] }
      reason: "用户新增需求: 扫描引擎提取为可独立发布的引擎 + CLI 项目, UI/CLI/Agent 三类消费端, scope 升至 global 并新增打包/发布/E2E (tooling-ci)。"
    - phase: design
      date: 2026-06-06
      from: { confidence: low }
      to: { confidence: medium }
      reason: "design 实测提取仅 4 文件 Electron 耦合 (watcher 唯一可注入解耦), 节奏定 hybrid 先建 CLI/E2E 闭环再增量迁移, 既有 relations/descriptors/manifest 基础设施可复用, 不确定性下降。net/scope/areas 维持。"
issue:
  number: 110
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/110
  id: I_kwDOSpnDwc8AAAABEmXxtw
  state: OPEN
gh_project:
  status: tracked
  project_id: PVT_kwHOADXbEs4BZHvQ
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgu6PSA
  item_status: In Progress
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 核心资产扫描模块生产级升级 (GH-110)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

目标: 对齐 Claude Code / Codex 官方目录规范, 本机所有 agent 资产零遗漏全量扫描 + 完整关联关系 (插件 ↔ skill/mcp/hooks/子代理); 核心扫描与 Scope 策略收敛统一模块; 消除性能瓶颈; 边栏统一 loading UI; Scope 秒级切换; UI 全用 HeroUI 控件且动画流畅; 并行折叠相关 issue; 补无副作用测试。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
