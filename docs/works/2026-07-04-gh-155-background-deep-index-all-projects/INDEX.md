---
task: 2026-07-04-gh-155-background-deep-index-all-projects
task_id: GH-155
type: feature
phase: implement
created: 2026-07-04
priority: P1
target_date: 
source:
  kind: docs-issues
  refs:
    - docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md
debt:
  estimate:
    incurred: 6
    repaid: 0
    net: 6
    scope: cross-process
    risk: high
    areas:
      - architecture
      - performance
      - ui-ux
    confidence: medium
    rationale: "explore 校准: 影响面实测锚定 (runtime 三方写并发 / IPC 扩字段 / per-project deep 原语 / SQLite gate 旁路), 均在初估 blast radius 内; net=6 维持。"
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
      date: 2026-07-04
      from: "net=6 confidence=low"
      to: "net=6 confidence=medium"
      reason: "三路 explore 实测锚定影响面; 估算值不变, 置信度提升。"
issue:
  number: 155
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/155
  id: I_kwDOSpnDwc8AAAABHqm9Yg
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgxvfpk
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# 后台 deep-index 全部项目 (backgroundIndexQueue)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

Option C: AgentAssetRuntime 加 backgroundIndexQueue, 启动后枚举 projectCandidates 入队 (最近活跃优先), 复用 GH-135 scheduler (idle/AC 门控) + 长驻 helper + backpressure, 低优逐项目 deep-scan + 增量持久化 (GH-151 replaceBySourceKey); activate 路径语义不动。进度可见性: 侧栏 hairline + [全局] 视图未完成时 "已索引 N/M" 轻量提示。

## 产物
- [ ] 00-PRD.md — 原始输入快照
- [ ] 01-ANALYSIS.md — Explore 产物
- [ ] 02-SPEC.md — Design 产物
- [ ] 03-PLAN.md — 活任务清单
- [ ] 04-POLISH.md — 可选抛光记录

## 并行边界 (2026-07-04)
- 共享工作区另有 ui-ux 维护批次 (renderer + components/ui); 本任务动 packages/berth-scan-engine/src/engine + src/main。
- 唯一潜在交叠: [全局] 视图 banner (renderer) — 做到该步先 git pull, 避开 ui-ux 批次正在拆的文件; 撞 registry/契约类共享文件按 _shared.md 不变量 11 四步法。

## 待澄清 (blocked 时填)
