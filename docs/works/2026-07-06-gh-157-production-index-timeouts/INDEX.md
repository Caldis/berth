---
task: 2026-07-06-gh-157-production-index-timeouts
task_id: GH-157
type: bug
phase: verify
created: 2026-07-06
priority: P1
target_date: 
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/157
debt:
  estimate:
    incurred: 7
    repaid: 0
    net: 7
    scope: cross-process
    risk: high
    areas:
      - performance
      - testability
      - architecture
    confidence: low
    rationale: "Explore 校准: 根因是 packaged app 默认 cwd=/ 被当作 projectDir, 同时日志缺少等级与 scan-helper 事务上下文; 修复仍跨 main/helper/engine log/test。"
  final:
    incurred: 7
    repaid: 0
    net: 7
    scope: cross-process
    risk: high
    areas:
      - performance
      - testability
      - architecture
    confidence: medium
    rationale: "Root cause and production evidence are captured; tests cover unsafe packaged cwd handling, levelled logs, and helper host protocol stability. Remaining risk is release packaging/runtime confirmation in the installed app after a new build."
  revisions:
    - phase: explore
      date: 2026-07-06
      from:
        incurred: 8
        repaid: 0
        net: 8
        scope: cross-process
        risk: high
        areas: [performance, testability, architecture]
        confidence: low
      to:
        incurred: 7
        repaid: 0
        net: 7
        scope: cross-process
        risk: high
        areas: [performance, testability, architecture]
        confidence: medium
      reason: "生产现场确认 projectDir=/ 造成全盘扫描; 修复边界收敛到默认目录选择、helper 事务日志和日志等级。"
issue:
  number: 157
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/157
  id: I_kwDOSpnDwc8AAAABHyBcSA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgx2VEk
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Production Index Rebuild Stalls With Scan Helper Timeouts

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)

无。

## Verify 记录

- 生产复现: `/tmp/berth-gh-157-20260706-160837` 保留 production app 现场日志、SQLite snapshot 和进程采样; `projectDir="/"` + 120s watchdog + helper `uv_fs_scandir` 解释索引 5h 未完成与 agent selector 缺失。
- 目标测试: `pnpm vitest run tests/unit/project-dir.test.ts tests/unit/main-log.test.ts tests/unit/helper-host.test.ts tests/unit/domain-log.test.ts tests/unit/typed-ipc.test.ts` 通过, 5 files / 29 tests。
- 机械门禁: `pnpm typecheck`, `pnpm lint`, `pnpm test` 通过; 全量 test 为 194 files / 1476 tests。
- harness: `pnpm harness:check --work docs/works/2026-07-06-gh-157-production-index-timeouts` 通过。
- Project strict check: GH-157 字段需同步; GH-150 相关既有 Project 不一致不属于本任务。
