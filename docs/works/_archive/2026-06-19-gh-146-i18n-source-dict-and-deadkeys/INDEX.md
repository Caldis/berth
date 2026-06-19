---
task: 2026-06-19-gh-146-i18n-source-dict-and-deadkeys
task_id: GH-146
type: maintenance
phase: archive
created: 2026-06-19
priority: P2
target_date:
maintenance:
  subtype: architecture
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-10-IMPROVEMENT-renderer-dir-semantics.md
    - docs/issues/2026-06-10-IMPROVEMENT-gh115-residuals.md
debt:
  estimate:
    incurred: 1
    repaid: 4
    net: -3
    scope: module
    risk: low
    areas:
      - architecture
    confidence: low
    rationale: "新建 sources.* + 3 函数改造 (incurred 1, 行为不变); 消除 local-source-copy 平行翻译机制 + 删 9 真死键 + ZH 文案锁定测试 (repaid 4); net -3。唯一消费点 project-scope-switcher, 影响面封闭。explore 发现第二份平行字典 agentPluginSources 本批不动。verify 校准。"
  final:
    incurred: 1
    repaid: 4
    net: -3
    scope: module
    risk: low
    areas:
      - architecture
    confidence: high
    rationale: "verify 校准: 新建 sources.* (code 22+status+statusCount) + local-source-copy 3 函数改吃 t() 删平行字典 (净 -227 行) + project-scope-switcher 三处传 t + 删 9 settings 死键; 16 test 绿 (project-scope-switcher 9 未改全绿=en 渲染逐字不变 + sources-i18n 4 ZH 锁定 + i18n-plural 3 对称), ZH missing=未发现 防漂移双锁。incurred 1 (行为不变), repaid 4 (消除平行机制 + 删死键 + ZH 锁定 + 可维护性), net -3。第二份平行字典 agentPluginSources 记后续。confidence high。"
  revisions: []
issue:
  number: 146
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/146
  id: I_kwDOSpnDwc8AAAABGEAx_Q
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
  item_id: PVTI_lAHOADXbEs4BZHvQzgwRpno
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# i18n: local-source 双语字典并入 i18next + settings 残键清理

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

## 产物
- [x] 00-PRD.md — 原始输入快照 (docs/issues 来源)
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物
- [x] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
