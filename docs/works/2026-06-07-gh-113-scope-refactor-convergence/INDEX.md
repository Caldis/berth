---
task: 2026-06-07-gh-113-scope-refactor-convergence
task_id: GH-113
type: feature
phase: implement
created: 2026-06-07
priority: P1
target_date:
source:
  kind: user-request
  refs:
    - https://github.com/Caldis/berth/issues/113
debt:
  estimate:
    incurred: 10
    repaid: 4
    net: 6
    scope: cross-process
    risk: high
    areas:
      - architecture
      - performance
    confidence: low
    rationale: "0.0-new 初始估算: 重定义三档 scope 语义 (全局=全设备所有项目+用户+企业, 需扫会话派生现存项目目录 → 性能) + 收敛分散 scope 逻辑到统一模块 + 修跨适配器同一物理文件重复扫描 (AGENTS.md)。跨 scanner/runtime/shared scope/switcher, scope=cross-process, risk high。Codex 两轮 review 守护。explore/design 后校准。"
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
    - phase: implement
      note: "T2 初版 naive 套 shared assetMatchesAppScope 破坏继承链可见 (project-scope.e2e 红); reframe 为 T3a owner-tagging 谓词 (显式 owner 过滤 + 无 owner=活动项目放行), 同时修继承链 bug 并完成 search/列表收敛。"
    - phase: implement
      note: "Codex B① 独立后台 shallow worker 降级为性能后续 (功能正确性由 in-scan 浅扫已满足); resolveScanPlan 真分支未引入 (现架构 appendShallowConventions 已隔离深/浅, 无 projectDirs 过载)。"
    - phase: explore
      note: "2026-06-07 用户重定义核心: [全局]=全设备全部资产完整结果 (含能力, 非仅约定), 启动即后台扫全部, 切 scope 仅 narrow-down; conventions-only 是 BUG; 扫描须为 spotlight 式后台渐进增量可暂停可配置索引器。任务重开 implement→explore, 走调研→重设计→Codex 两轮→落地。已落地 T1/T3a/T4 (去重/owner 谓词/确定式 id) 作为地基保留; T3b 浅索引 approach 被全量索引器取代。完整需求见 docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer。"
issue:
  number: 113
  repo: Caldis/berth
  url: https://github.com/Caldis/berth/issues/113
  id: I_kwDOSpnDwc8AAAABEpvbRA
  state: OPEN
gh_project:
  status: tracked
  project_number: 6
  project_url: https://github.com/users/Caldis/projects/6
  item_id: PVTI_lAHOADXbEs4BZHvQzgu9T4I
  item_status: In Progress
  project_id: PVT_kwHOADXbEs4BZHvQ
artifacts:
  source: 00-PRD.md
  analysis: 01-ANALYSIS.md
  spec: 02-SPEC-background-indexer.md
  spec_v1: 02-SPEC.md
  research: review/research-synthesis.md
  plan: 03-PLAN.md
  polish: 04-POLISH.md
---

# Scope 特性重构 + 模块收敛 + 去重扫描 (GH-113)

任务索引与交接锚。phase 字段为唯一状态源, `harness-0.1-continue` 据此续跑。

目标 (常规用户心智): 全局=设备上所有可扫描资产 (所有项目+用户+企业); 用户域=项目外公共/用户级; 项目域=保持现状。收敛分散 scope 逻辑到统一模块; 修复同一物理文件被多适配器重复扫描 (AGENTS.md)。流程同 GH-111 (Codex 两轮交叉 review)。审查记录见 `review/`。

**2026-06-07 重定义 (扩大范围, 任务重开 explore)**: [全局] 必须是全设备**全部资产**的完整扫描结果 (含能力, 非仅约定), 应用启动即后台扫全部; 切 用户/项目 scope 仅 narrow-down 已扫结果。扫描重构为 **spotlight 式后台渐进增量可暂停可配置索引器** (持久化缓存/增量检测/调度背压/局部 loading/可配置策略)。conventions-only (T3b) 被取代。完整需求: `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md`。已落地 T1/T3a/T4 作地基保留。第二轮调研产物见 `review/`/新 ANALYSIS。

## 续跑指南 (handoff — context 重置后从这里接)

**已落地 (全 CI-green, master 干净)**: 设计 (Codex 两轮 `review/scan-redesign-round*-codex.md` + 调研 `review/research-synthesis.md`) → 终版 `02-SPEC-background-indexer.md` (不变量 I1 单管线/I2 scope=过滤/I3 SQLite 真源)。增量: **Pre-T0** 全 parser 确定式 id `assetEntityId` (makeid bug 已 RESOLVED) · **可观测性 v1** (IndexHairline/IndexingInline/IndexPulse + useIndexActivity) · **T1** 快照持久化冷启 SWR (`snapshot-store.ts` + runtime restorePersistedSnapshot) · **watcher 加固** (awaitWriteFinish/atomic + 事件带 sourceKey) · **全局=全部能力** (`scanProjectCapabilities` owner-tag + 指纹缓存 worker↔main 往返)。用户核心诉求"全局=全设备所有资产"**已功能达成 + e2e 验证** (`tests/e2e/global-shallow-scope.e2e.ts`)。

**下一步 (按价值×独立性, 详见 03-PLAN V2 + 各 issue)**:
1. **SQLite 持久真索引 (I3)** — JSON 快照 → 行级 SQLite。**起点先 de-risk**: better-sqlite3 是 Node-ABI 构建, Electron 主进程加载需 electron-rebuild + `electron.vite.config` external; e2e 探针验证打包主进程能 open DB。通过后建 `SqliteSnapshotStore implements SnapshotStore` (T1 已留好接口, drop-in)。关联 BUILD_ENV/原生模块 friction。
2. **实时增量 (I1 单管线)** — 抽 `deriveAssetsForFile(filePath)` (派发逻辑参考 `shallow-conventions.ts` CAPABILITY_FILES/GLOBS); runtime 加 `applyFileChange(event)` 按 `sourceKey` 替换该文件资产; main 把 watcher listener 接到它 (事件已带 sourceKey) → 单文件改不再全量重扫。
3. **可暂停/可控 + 设置档位** (用户明确要) — 需先有协作式取消基建 (worker checkpoint 轮询, 非 SAB); 最后做。
4. 收尾: sessions/health/usage 入口统一 `assetMatchesAppScope`; per-root 完成度 (现各页 empty 态已用 LoadingState 兜底, 不误导); 设备级统一 watcher; 待全量索引稳定后收敛 `scanShallowConventions`。

**铁律**: 确定式 id 走 `assetEntityId`; scope=过滤真源 `assetMatchesAppScope`; 改 scope/search/watcher 推送前本地跑 `project-scope`+`global-shallow` e2e (friction 20260606); 提交前对**最终 staged 状态**重跑 lint+typecheck (friction 20260607 陈旧绿)。

## 产物
- [x] 00-PRD.md — 原始输入快照
- [x] 01-ANALYSIS.md — Explore 产物
- [x] 02-SPEC.md — Design 产物 (R2 终核)
- [x] 03-PLAN.md — 活任务清单 (T1–T5)
- [ ] 04-POLISH.md — 可选抛光记录

## 待澄清 (blocked 时填)
