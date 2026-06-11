---
task: 2026-06-11-gh-118-renderer-error-channels
task_id: GH-118
type: maintenance
phase: implement
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
    confidence: high
    rationale: "explore 实勘: 5 处吞错点/样板/消费面全部确认 (plugins 已先行修复出范围, usage.tsx 页面自有处理不属吞错); 改 2 hook 文件 + 4 消费端 + i18n + 测试, 多页渲染面故 risk medium。"
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
    - phase: 1.0-explore
      date: 2026-06-11
      from: "confidence medium"
      to: "confidence high"
      reason: "吞错点终表实勘 (行号/内容漂移修正: plugins 已先行修复, useUsageSummary 顶替进表); 样板三件套 (useSessions/ErrorState/session-error.test) 与消费面 (app-layout/overview/memory-view/hooks-lifecycle-view) 全部确认。"
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
- [x] 01-ANALYSIS.md — Explore 产物 (吞错点终表 5 处实勘 + 样板/消费面/blast radius + AC-1~6)
- [x] 02-SPEC.md — Design 产物 (hook 契约×4 + 条件形态渲染表 + i18n 清单 + 测试矩阵 9 项)
- [x] 03-PLAN.md — 活任务清单 (T1 usage → T2 health → T3 memory → T4 runtime → T5 收口, 顺序执行)

## 背景速览
- 5 处 `.catch(() => {})` (2026-06-11 grep 核实): `use-ipc.ts` 138/156/396/437 + `use-memory.ts` 65; 最重者 useAssetRuntime 初始拉取失败整应用 idle 静默空转。
- 样板: GH-110 P4.3 (sessions/session-detail) — error+reload 通道 + 共享 ErrorState + 错误/空态区分 + 重试; 测试参照 `tests/renderer/session-error.test.tsx`。
- 推进序: useAssetRuntime → useHealthChecks → useAgentCapabilityPlugins → useMemory; CachedResource 原语不动。
- 2026-06-11 优先级评审第二位 (全 issue 中故障模式对用户最恶劣者)。

## 待澄清 (blocked 时填)
