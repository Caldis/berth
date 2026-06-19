---
task: 2026-06-20-gh-149-settings-sources-flaky-fix
task_id: GH-149
type: bug
phase: archive
created: 2026-06-20
priority: P2
target_date:
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-20-BUG-settings-sources-test-unhandled-rejection-flaky.md
debt:
  estimate:
    incurred: 1
    repaid: 2
    net: -1
    scope: module
    risk: low
    areas:
      - testability
    confidence: medium
    rationale: "测试层 unmount+flush (A1) + setup afterEach cleanup+flush (B) 修 settings-sources teardown 竞速 unhandled rejection + 兜底同模式 (settings-page/accent 潜在 flaky); incurred 1 (测试基建小改), repaid 2 (修 flaky + 收敛同模式)。hook 守卫根治 (C) blast radius 大 (use-ipc/use-update 被 Dashboard/Sessions 共用), 独立 issue 不做。explore 已定根因 (4 mount-time IPC promise 无守卫, mock 不缺纯时序)。verify 校准。"
  final:
    incurred: 1
    repaid: 2
    net: -1
    scope: module
    risk: low
    areas:
      - testability
    confidence: medium
    rationale: "verify: A1 (settings-sources.test.tsx unmount + await act flush, 13 行) drain SettingsContent 挂载 4 条 window.api promise chain 在 jsdom teardown 前。确定性修复 (unmount 忽略 teardown 后 setState + flush drain pending), 真跑全套 1297 + 0 unhandled + typecheck/lint 绿。fake-timer 测试存在故全局 afterEach setTimeout flush (B) 不安全 → 只 A1; C (SettingsContent IPC mounted 守卫根治, blast radius 大) + 同模式 settings-page/accent + setup cleanup 标准化 (act flush) 立 IMPROVEMENT issue 后续。incurred 1 (测试小改), repaid 2 (修 flaky CI 基线 + 同模式风险记录)。confidence medium: 本地 mac 难稳定复现 baseline flaky (时序本质), A1 确定性逻辑 + CI 实证 (f1ebc30f) 为据。"
  revisions: []
issue:
  number: 149
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/149
  id: I_kwDOSpnDwc8AAAABGEuVtQ
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgwSPX4
artifacts:
  source: 00-BUG.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# fix: settings-sources.test.tsx unhandled rejection flaky (use-ipc promise teardown 泄漏)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-BUG.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
