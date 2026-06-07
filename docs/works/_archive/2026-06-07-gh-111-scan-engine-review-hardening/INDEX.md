---
task: 2026-06-07-gh-111-scan-engine-review-hardening
task_id: GH-111
type: feature
phase: archive
created: 2026-06-07
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/111
    - review/round1-codex.md
    - review/round2-codex.md
    - docs/works/_archive/2026-06-06-gh-110-scan-engine-prod-upgrade/
debt:
  estimate:
    incurred: 6
    repaid: 5
    net: 1
    scope: cross-process
    risk: medium
    areas:
      - architecture
      - performance
      - testability
    confidence: medium
    rationale: "Codex×Claude 两轮对抗审查得出的 Tier-1 加固: 覆盖纠正 (output-styles/skills) + 可观测性 (区分缺失/坏数据) + 正确性 (statSync/watcher/samePath/scanner 代际) + partial 去 raw。多为边界清晰的缺陷修复 (repay 静默失败/覆盖技术债), 跨适配器/worker/watcher (scope cross-process)。Tier-2 架构项 (长驻 worker/流式/退役 legacy scanner) 记 issues 不在本任务。"
  final:
    incurred: 6
    repaid: 7
    net: -1
    scope: cross-process
    risk: low
    areas:
      - architecture
      - performance
      - testability
    confidence: high
    rationale: "Tier-1 11 项修复 (覆盖 output-styles/skills; 可观测 settings/glob/session 区分缺失与坏数据; 正确性 statSync 守护/watcher 自忽略/samePath/runRefresh 代际竞态; perf partial 去 raw) 全部单测覆盖 (新增 6 个测试文件) + 全量回归 (111 文件 736 用例) + scan-engine 24 + build + CI 绿 + 冷启 smoke。repay 静默失败与覆盖技术债 (修缺失数据看似无数据的根因类) 大于新增的少量 helper/守护复杂度 → 净降债 net -1。risk medium→low、confidence medium→high。Tier-2 架构项 (长驻 worker/流式/退役 legacy scanner/scope 继承/disableAllHooks) 已记 5 条 docs/issues 跟踪。"
  revisions:
    - phase: verify
      date: 2026-06-07
      from: { repaid: 5, net: 1, risk: medium, confidence: medium }
      to: { repaid: 7, net: -1, risk: low, confidence: high }
      reason: "实现+全量回归后下修: 11 项修复全测试覆盖 + CI 绿 + 冷启 smoke, 多为修复静默失败/覆盖缺陷 (净降债), 残余风险与不确定性下降。"
issue:
  number: 111
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/111
  id: I_kwDOSpnDwc8AAAABEpEIeg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgu8qVg
  item_status: Done
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 扫描引擎对抗式审查加固 (GH-111)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

来源: 用户 /goal — 让 Codex 对扫描引擎做对抗式审查, Claude 二次对抗核验, 两轮后落地改进。两轮审查原始记录见 `review/round1-codex.md` / `review/round2-codex.md`。

## 产物
- [x] 00-PRD.md — 原始输入快照 (审查综合)
- [x] 01-ANALYSIS.md — Explore 产物 (两轮审查综合 + 代码图 + Tier 拆分)
- [x] 02-SPEC.md — Design 产物 (各项方案 + 测试矩阵)
- [x] 03-PLAN.md — 活任务清单 (T1–T9)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
