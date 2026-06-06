---
task: 2026-06-06-gh-110-scan-engine-prod-upgrade
task_id: GH-110
type: feature
phase: explore
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
    incurred: 8
    repaid: 3
    net: 5
    scope: cross-process
    risk: high
    areas:
      - architecture
      - performance
    confidence: low
    rationale: "扫描引擎 + 适配器 + Scope runtime + IPC + 渲染层全链路升级, 收敛核心模块 (repay architecture) 同时新增全量覆盖/关联/缓存 (incur)。explore/design 后校准。"
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
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
