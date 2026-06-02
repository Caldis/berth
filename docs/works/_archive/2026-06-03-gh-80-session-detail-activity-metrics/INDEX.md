---
task: 2026-06-03-gh-80-session-detail-activity-metrics
task_id: GH-80
type: bug
phase: archive
created: 2026-06-03
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-02-BUG-session-detail-activity-metrics.md
debt:
  estimate:
    incurred: 4
    repaid: 0
    net: 4
    scope: cross-process
    risk: medium
    areas:
      - architecture
      - testability
      - ui-ux
    confidence: medium
    rationale: "explore 确认问题跨 main parser、sessions:get detail 契约和 renderer session detail 展示; Codex 侧 skills/MCP/hooks 元数据缺口会影响列表、详情和关系解析, token rate 文案和显示也需要 UI 校准。"
  final:
    incurred: 4
    repaid: 3
    net: 1
    scope: cross-process
    risk: low
    areas:
      - architecture
      - testability
      - ui-ux
    confidence: high
    rationale: "已补 Claude/Codex parser usage window、Codex 结构化 skill/MCP/hook 提取、sessions:get activityMetrics 契约、Session Detail UI 来源文案和覆盖测试。剩余 net=1 来自 Codex rollout JSONL 缺少官方稳定 schema, parser 仍需以本地结构化字段容错。"
  revisions:
    - at: 2026-06-03
      from:
        incurred: 3
        net: 3
        scope: module
        confidence: low
      to:
        incurred: 4
        net: 4
        scope: cross-process
        confidence: medium
      reason: "explore 发现 Codex session meta 当前将 skillsUsed/mcpServers/hooksFired 置空, sessions:get 和 renderer 指标都会消费这些字段。"
issue:
  number: 80
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/80
  id: I_kwDOSpnDwc8AAAABEKZomw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguiCCY
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Session Detail Activity Metrics

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
