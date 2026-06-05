---
task: 2026-06-05-gh-107-memory-viewer-drawer-top
task_id: GH-107
type: bug
phase: implement
created: 2026-06-05
priority: P2
target_date:
source:
  kind: user-request
  refs: []
debt:
  estimate:
    incurred: 1
    repaid: 0
    net: 1
    scope: file
    risk: low
    areas:
      - ui-ux
    confidence: high
    rationale: "explore 校准; 根因为 file-viewer-drawer macOS 分支冗余顶部偏移, 方案 B 仅改 drawer 两个 class + 同步 1 个 renderer 测试, backdrop 红绿灯契约不动。"
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
      date: 2026-06-05
      from: "incurred 2 / scope module / risk medium / confidence low"
      to: "incurred 1 / scope file / risk low / confidence high"
      reason: "根因为 file-viewer-drawer macOS 分支冗余顶部偏移 (方案 B); backdrop 红绿灯契约与 header no-drag 不动, 既有 renderer 测试锁定。"
issue:
  number: 107
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/107
  id: I_kwDOSpnDwc8AAAABEdLr1A
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzguy0e8
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 记忆模块侧边 md 查看器顶部未贴合窗口顶部

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
