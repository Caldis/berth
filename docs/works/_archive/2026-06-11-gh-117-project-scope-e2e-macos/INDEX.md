---
task: 2026-06-11-gh-117-project-scope-e2e-macos
task_id: GH-117
type: bug
phase: archive
created: 2026-06-11
priority: P1
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-08-BUG-project-scope-e2e-macos.md
debt:
  estimate:
    incurred: 1
    repaid: 2
    net: -1
    scope: module
    risk: low
    areas:
      - testability
    confidence: high
    rationale: "explore 定性: e2e fixture 未隔离 HOME 致宿主数据污染 (activate 10s > 断言 5s), 非产品 bug; 产品零改动, 移除 skip + 6 文件隔离偿还覆盖洞与宿主依赖。"
  final:
    incurred: 1
    repaid: 2
    net: -1
    scope: module
    risk: low
    areas:
      - testability
    confidence: high
    rationale: "最终 diff 全部在 tests/e2e (helper +47 行, 6 文件接入净 -28 行); 移除 darwin skip 偿还 macOS 覆盖洞, 三隔离根根除全部 e2e 宿主数据依赖; 双轮全量 e2e 绿 + CI 绿, 无残余风险。"
  revisions:
    - phase: 1.0-explore
      date: 2026-06-11
      from: "incurred 2 / repaid 1 / net 1 / risk medium / confidence low"
      to: "incurred 1 / repaid 2 / net -1 / risk low / confidence high"
      reason: "根因三重实证为 e2e harness 隔离缺失 (IPC 直通绿 / UI 时间线 10.3s>5s / HOME 隔离后 133ms); 产品代码零改动, 影响面收窄至 tests/e2e。"
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
  item_status: Done
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
- [x] 01-ANALYSIS.md — Explore 产物 (根因实证: e2e fixture 未隔离 HOME, 宿主数据污染; 非产品 bug)
- [x] 02-SPEC.md — Design 产物 (共享 launch helper 统一隔离; win 保守不动; 断言不放宽)
- [x] 03-PLAN.md — 活任务清单 (T1 helper → T2 project-scope → T3 其余 5 文件 → T4 推送 CI)

## 背景速览
- `tests/e2e/project-scope.e2e.ts` 在 macOS 稳定失败 (trigger 停 `Global`, 重试 7 次), Windows 本地与 CI 绿; 当前被 `test.skip(darwin)` 跳过 (project-scope.e2e.ts:12), macOS「切到 session 派生 project」路径零 e2e 覆盖。
- 同环境 `global-shallow-scope.e2e.ts` 绿 → 失败局限于「切到 session 派生 project」一步。
- 2026-06-11 优先级评审定为全 issue 第一优先: 唯一 BUG + mac 为用户主力设备 + Phase D 引擎重构 (runtime 拆分) 即将大改 scope 切换路径, 重构前必须补上 macOS 回归网。
- 验收方向: 根因定性 (产品 vs harness) → 对症修复 (harness 时序则加等待条件而非放宽断言) → 移除 skip, macOS 本地 e2e 绿。

## 待澄清 (blocked 时填)
