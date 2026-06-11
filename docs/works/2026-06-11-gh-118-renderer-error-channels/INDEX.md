---
task: 2026-06-11-gh-118-renderer-error-channels
task_id: GH-118
type: maintenance
phase: explore
created: 2026-06-11
priority: P2
target_date:
maintenance:
  subtype: ui-ux
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-renderer-swallowed-error-channels.md
debt:
  estimate:
    incurred: 1
    repaid: 3
    net: -2
    scope: module
    risk: medium
    areas:
      - ui-ux
    confidence: medium
    rationale: "0.0-new 初始估算: 5 处吞错点按 GH-110 样板逐 hook 补 error 通道 (偿 GH-115 R13 残余); 改 4 个 hook 消费面涉及多页渲染故 risk medium; explore 后按消费面实情校准。"
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
  number: 118
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/118
  id: I_kwDOSpnDwc8AAAABFH9d6Q
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvaHvE
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# renderer hooks 层 5 处静默吞错补 error 通道

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues/2026-06-10-IMPROVEMENT-renderer-swallowed-error-channels.md)
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 背景速览
- 5 处 `.catch(() => {})` (2026-06-11 grep 核实): `use-ipc.ts` 138/156/396/437 + `use-memory.ts` 65; 最重者 useAssetRuntime 初始拉取失败整应用 idle 静默空转。
- 样板: GH-110 P4.3 (sessions/session-detail) — error+reload 通道 + 共享 ErrorState + 错误/空态区分 + 重试; 测试参照 `tests/renderer/session-error.test.tsx`。
- 推进序: useAssetRuntime → useHealthChecks → useAgentCapabilityPlugins → useMemory; CachedResource 原语不动。
- 2026-06-11 优先级评审第二位 (全 issue 中故障模式对用户最恶劣者)。

## 待澄清 (blocked 时填)
