---
task: 2026-06-13-gh-132-codex-session-title-detection
task_id: GH-132
type: bug
phase: verify
created: 2026-06-13
priority: P2
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/132
debt:
  estimate:
    incurred: 3
    repaid: 0
    net: 3
    scope: cross-process
    risk: medium
    areas:
      - ui-ux
      - testability
    confidence: medium
    rationale: "Explore/design 后校准: 修复点在 Codex adapter 标题索引读取, 影响 session asset name, sessions:list、Overview recent sessions 与 session detail 共用该摘要。"
  final:
    incurred: 3
    repaid: 1
    net: 2
    scope: cross-process
    risk: low
    areas:
      - ui-ux
      - testability
    confidence: high
    rationale: "Codex session title 解析改为优先读取 session_index.jsonl, 兼容 rollout thread_name_updated, 并对无索引 subagent 会话使用首条 user_message 兜底; parser/adapter/source descriptor 测试、全量 lint/typecheck/test/harness 与真实 Electron Sessions 页面验证通过。"
  revisions:
    - stage: design
      date: 2026-06-13
      from:
        incurred: 2
        repaid: 0
        net: 2
        scope: module
        risk: medium
        areas:
          - ui-ux
          - testability
        confidence: low
      to:
        incurred: 3
        repaid: 0
        net: 3
        scope: cross-process
        risk: medium
        areas:
          - ui-ux
          - testability
        confidence: medium
      reason: "标题从 Codex adapter 写入 session asset 后经 main IPC 到 renderer 多个消费面, 影响面从单模块上调为跨进程数据契约。"
issue:
  number: 132
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/132
  id: I_kwDOSpnDwc8AAAABFXnqWw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvnzgY
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Fix Codex Session List Title Detection

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md / 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
