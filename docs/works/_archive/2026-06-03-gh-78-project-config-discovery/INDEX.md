---
task: 2026-06-03-gh-78-project-config-discovery
task_id: GH-78
type: bug
phase: archive
created: 2026-06-03
priority: P1
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/resolved/2026-06-02-BUG-project-config-discovery.md
debt:
  estimate:
    incurred: 5
    repaid: 0
    net: 5
    scope: cross-process
    risk: high
    areas:
      - architecture
      - testability
    confidence: medium
    rationale: "项目级配置发现会影响 scanner、IPC、搜索索引和多个 renderer 页面, 需要跨进程修复并补 fixture。"
  final:
    incurred: 6
    repaid: 5
    net: 1
    scope: cross-process
    risk: low
    areas:
      - architecture
      - testability
    confidence: high
    rationale: "新增 project config roots helper 并让 Claude/Codex scanner、source coverage、watcher 和 project scope e2e 共用同一套子目录到仓库根发现规则; 主要缺口已修复, 剩余 debt 是跨进程路径层级逻辑的长期维护成本。"
  revisions:
    - at: verify
      date: 2026-06-03
      from:
        incurred: 5
        repaid: 0
        net: 5
        confidence: medium
      to:
        incurred: 6
        repaid: 5
        net: 1
        confidence: high
      reason: "实现后确认影响面仍为 cross-process; 新增少量路径 helper 复杂度, 但补齐了父级项目配置扫描、source coverage、watcher 和 e2e 覆盖。"
issue:
  number: 78
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/78
  id: I_kwDOSpnDwc8AAAABEJrZZQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzguhchQ
  item_status: Done
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Project Config Discovery

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
