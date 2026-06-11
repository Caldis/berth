---
task: 2026-06-11-gh-117-project-scope-e2e-macos
task_id: GH-117
type: bug
phase: explore
created: 2026-06-11
priority: P1
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md
debt:
  estimate:
    incurred: 2
    repaid: 1
    net: 1
    scope: module
    risk: medium
    areas:
      - testability
    confidence: low
    rationale: "0.0-new 初始估算: 根因未定 (产品 scope 切换 vs e2e harness 时序), 修复后移除 test.skip(darwin) 偿还 macOS e2e 覆盖洞; explore 定性后校准。"
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
  number: 117
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/117
  id: I_kwDOSpnDwc8AAAABFG9lCw
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgvZNMI
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
---

# macOS 上 project-scope e2e 失败 — session 派生 project 切换根因调查与修复

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照 (docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md)
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单

## 背景速览
- `tests/e2e/project-scope.e2e.ts` 在 macOS 稳定失败 (trigger 停 `Global`, 重试 7 次), Windows 本地与 CI 绿; 当前被 `test.skip(darwin)` 跳过 (project-scope.e2e.ts:12), macOS「切到 session 派生 project」路径零 e2e 覆盖。
- 同环境 `global-shallow-scope.e2e.ts` 绿 → 失败局限于「切到 session 派生 project」一步。
- 2026-06-11 优先级评审定为全 issue 第一优先: 唯一 BUG + mac 为用户主力设备 + Phase D 引擎重构 (runtime 拆分) 即将大改 scope 切换路径, 重构前必须补上 macOS 回归网。
- 验收方向: 根因定性 (产品 vs harness) → 对症修复 (harness 时序则加等待条件而非放宽断言) → 移除 skip, macOS 本地 e2e 绿。

## 待澄清 (blocked 时填)
