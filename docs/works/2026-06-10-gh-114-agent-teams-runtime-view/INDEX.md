---
task: 2026-06-10-gh-114-agent-teams-runtime-view
task_id: GH-114
type: feature
phase: implement
created: 2026-06-10
priority: P2
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-03-BUG-agent-teams-runtime-state-classification.md
debt:
  estimate:
    incurred: 5
    repaid: 2
    net: 3
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
      - architecture
    confidence: medium
    rationale: "explore 校准: 官方契约 (experimental/存储路径/生命周期) 与本机数据形态 (config/inboxes/tasks schema) 已实测钉死; 新增面与 asset model 完全隔离 (memory/ 同型只读 IPC 域), 回归面仅 redirect 一处。incurred 含新 IPC 域 + 页面 + 实验性表面维护线; repaid 为关闭 issue 残余 UX 缺口。"
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
      date: 2026-06-10
      from: { incurred: 5, repaid: 2, net: 3, confidence: low }
      to: { incurred: 5, repaid: 2, net: 3, confidence: medium }
      reason: "数字不变, confidence 上调: 官方文档与本机样本把数据契约钉死, 架构落点 (memory/ 同型只读 IPC 域) 明确, 不确定性集中在 UI 细节。"
issue:
  number: 114
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/114
  id: I_kwDOSpnDwc8AAAABE9Gg-A
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvQOi4
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Agent Teams Runtime Collaboration View (UX-driven)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

## 续跑指南
- 用户已委托 UX 决策权: "从用户体验角度出发做最优设计和实现并落地" — design 阶段自主选定方案, 不再回询; 主观视觉验收按 _shared 不变量 22 的"用户已明确要求自主完成"例外处理 (Agent 自验)。
- 前置事实: GH-94 已删除静态资产面 (scanner/type/nav/copy/tests), 仅剩 `App.tsx` 的 `RemovedAgentTeamsInstructionRedirect`; 本机 `~/.claude/teams/` 有 5 个真实 team (config.json + inboxes), `~/.claude/tasks/{uuid}/` 为任务列表数据。
- Explore 必须先英文检索 Agent Teams 官方文档 (code.claude.com/docs/en/agent-teams) 核对 config.json / task list / mailbox 契约 (不变量 9)。
