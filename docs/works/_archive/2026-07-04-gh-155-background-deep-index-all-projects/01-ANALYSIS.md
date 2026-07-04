# 需求分析 (Explore 产物) — GH-155 后台 deep-index 全部项目

> 2026-07-04, 三路并行扫描汇总 (引擎 runtime/调度/持久化 · 主进程 helper + renderer 进度链 · 测试设施 + 旁支 issue)。锚点均为当前 master 实测。

## 现状理解

### 引擎侧 (packages/berth-scan-engine, electron-free)

- **AgentAssetRuntime** `engine/assets/runtime.ts:124` (单例 `:1078/:1087`): 状态机 + 数据提交 + 查询门面。`refresh()` `:412` → in-flight 时折进**单槽 latest-wins 队列** `queuePendingRefresh` `:845`; 否则经 `ScanCoordinator.run` 扫描。`commitScan` `:723` mint 新 `snapshot.id` (`:741`), 写 `snapshotCache`, 清 selectorCache, `persistIfDefaultView` (`:764`)。
- **ScanCoordinator** `engine/assets/scan-coordinator.ts`: 单飞 + in-flight 去重 + R4 代际 guard (`isCurrent` `:109`); **`:54-55` 注释已预留「背景 indexer (链③) 的 scheduling/backpressure 落点」**。
- **周期 scheduler**: `schedulePeriodic` `runtime.ts:505` (递归 setTimeout) → `runPeriodicScan` `:520` 门控: `idleOnly && idle < idleThresholdMs` 顺延, `acOnlyFullScan && onBatteryPower()` 跳过。调度动作是**整设备全量 refresh** (默认 24h), 非逐项目。门控信号经 `PowerMonitorLike` (`:72`) 由 main 注入 (`src/main/index.ts:236-239`)。
- **deep vs shallow 分叉**: `AssetScanner.scanAll` `engine/scanner.ts:80` — 各 adapter 深扫 active 项目 + user 级; `appendShallowConventions` `:312` (调用点 `:163`) 对非 active 的 session 派生项目仅 root-level 浅扫 (`shallow-conventions.ts:16/:67`, 无嵌套 glob)。**不存在 per-project deep 扫描函数** — 深扫只能整设备 scanAll。项目级能力源声明表 `adapters/claude-code/sources.ts:34` 已声明嵌套 pattern (`**/SKILL.md`、`**/*.md`), shallow 只是不用它。
- **projectCandidates**: `project-scope.ts:17` 仅从 session 资产 `meta.projectPath` 派生, commit 时存 `snapshot.projectCandidates` (`runtime.ts:747`)。候选带 `lastSeenAt` (`shared/scope.ts:11-20`) — **「最近活跃优先」数据现成**; 但默认 merge 排序是 sessionCount desc (`scope.ts:150-153`), 队列须自行按 lastSeenAt 重排。repo root 归一 `resolveProjectConfigRoots`。
- **持久化**: `SqliteSnapshotStore` 单库单份 snapshot; `save` 全量 (`sqlite-snapshot-store.ts:122`), `replaceBySourceKey` 行级 (`:141`, GH-151)。**只持久化 default/global view**: `persistIfDefaultView` `runtime.ts:810` 与 `persistFileChange` `:1009` 均 gate 到 initialProjectDir。
- **id 契约 (风险① 实底)**: entity id **确定式** `assetEntityId` (`shared/asset-dedupe.ts:41`), sourceKey = `dedupePathKey` — **同文件重扫 id 稳定, shallow→deep 行级替换幂等无 entity id churn**。churn 仅 snapshot 包裹 id (只驱动 selectorCache 失效)。
- **watcher**: `getAssetWatchPaths` `engine/watcher.ts:111` — 路径集 `start()` 时定死 (`:128-138`), **仅 active projectDir 的项目根**进 watch 集; 非 active 项目不被 watch (旁支 IMPROVEMENT 的实底)。
- **共享读路径**: search/health/insights/sessions 全经 `ensureReady()` + `SnapshotSelectorCache` (按 snapshot.id 键)。每次 commit/applyFileChange 清 cache → **逐项目提交 = M 次 selector 失效 + M 次派生读重算 + M 次 assets:changed 广播** (广播有 TrailingCoalescer 合并, selector 重算无合并)。

### 主进程侧 (src/main)

- **长驻 helper**: `scan-helper.ts` (utilityProcess) 内跑 `AssetScanner.scanAll` 纯执行器; `helper-host.ts` 单例 lazy fork + 崩溃自愈 + 120s inactivity 看门狗 + OS 节流 (darwin taskpolicy / linux ionice / **win 仅 BelowNormal CPU**)。**一次一个 scan, 不支持并发** (监听器直接挂同一 child)。协议: host→child `{type:'scan'}`, child→host `progress/partial/done/error`。
- **activate 路径**: `project-scope-runtime.ts:24` — cache hit 即时换缓存快照; miss → `void runtime.refresh({wait:false})` (`:42`, 回归守卫注释)。`setProjectDir` (`runtime.ts:373`) 会 `coordinator.swap` **换代丢弃在途扫描** — 后台队列若借 singleton projectDir 逐项目扫会反复劫持用户 scope 视图, **不可行**; 队列成果的天然落点 = `snapshotCache` 多项目共存 + global snapshot 行级折叠。
- **IPC**: 契约表 `pkg:shared/types/ipc.ts:702-706`。进度唯一通道 `assets:progress` payload `{status; partial?}` — **只有单次扫描文件级进度, 无项目级 N/M 承载**; 扩 `AssetRuntimeStatus` 或新事件须四方对账同批 (handlers/preload/IpcChannels/mock)。pause/resume/cancel/rebuild 控制通道已有。
- **设置**: 结构/控件全在 engine (`engine/assets/settings.ts`); `scanConcurrency` key 存在但零消费 (GH-152 标 supported:false); `batchPauseMs`/`excludePaths` 已透传 helper。

### 渲染侧 (src/renderer)

- 进度链: `assets:progress` → `use-ipc.ts:210` `applyAssetProgress` → store → `useIndexActivity`。
- **hairline 已存在**: `IndexHairline` 单点挂 `components/layout/app-layout.tsx:84` (顶栏下沿常驻)。侧栏 footer `IndexPulse` + hover `ScanProgressPanel` (`sidebar-scan-status.tsx`)。`IndexingInline` 定义了但生产未挂载 (可作 banner 自订阅模式参考)。
- [全局] 是跨页 scope mode (`scopeSelection.mode==='global'`), 非单页。**banner 最小侵入挂点 = `app-layout.tsx:92` `{children}` 之上**自包含组件 (订阅封在组件内, 保 GH-153 T8「布局壳零重渲染」不变量); 样式复用 `NoticePanel` info tone。
- i18n: 只动 `locales/en.json` + `zh.json`; health-i18n golden 不 pin renderer 新增 nav 键, 无影响 (git status 里两个未提交 golden snap 属另一 session, 勿碰)。

## 关联与依赖

| 改动面 | 符号/文件 | 消费方 / 风险 |
|---|---|---|
| runtime 队列驱动 | `runtime.ts` + 新 `background-index-queue.ts` | getEngineInfo/scheduler snapshot; pause/resume 语义 |
| per-project deep 原语 | `shallow-conventions.ts` 旁新增 (复用 `projectCapabilitySources` pattern + AssetFileCache) | scanner/helper; 或 helper 新命令粒度 |
| snapshot 折叠写路径 | `applyPartial`/`commitScan`/`applyFileChange`/`foldKeepingShallow` (`runtime.ts:1043`) | **共享读路径全量** → 属「搜索相关」, e2e 必跑本地 |
| SQLite 写 | 直调 `replaceBySourceKey` 或放宽 default-view gate (`runtime.ts:1010`) | 冷启 restore / snapshot-persistence e2e |
| IPC 契约 | `AssetRuntimeStatus` 扩字段 | 四方对账测试 + preload + mock 同批 |
| renderer | 新 banner 组件 + app-layout 单行 + en/zh json | e2e DOM 断言面 (grep tests/e2e) |
| 旁支修复 (Q1 入批) | applyPartial/commitScan sourceKey 保留合并 | mid-scan BUG issue; agent-asset-runtime 单测 |

**最大风险面 = 三方写并发**: `applyFileChange` (watcher) / `applyPartial` (前台扫) / 后台队列提交共改 mutable `this.snapshot` 无锁。队列必须经 ScanCoordinator 单飞窗口 + 代际 guard 提交, 不得直改 snapshot。次风险 = selector 失效风暴 (逐项目 commit) 与 helper 串行独占 (前台让位策略)。

## 任务分类与 debt 校准

- type: feature (不变) / maintenance.subtype: 不适用
- source.kind: docs-issues, refs 不变
- debt estimate 修正: net=6 维持; confidence low→medium (影响面已实测锚定, 新增面 IPC 扩字段/per-project 原语/SQLite gate 旁路均在初估 blast radius 内)
- scope / risk / areas: cross-process / high / [architecture, performance, ui-ux] — 全部确认
- revision: 见 INDEX `debt.revisions[0]` (2026-07-04 explore, confidence 校准)

## 验收标准

1. **渐进补全**: 启动后不激活任何项目, 非活动项目的嵌套能力 (深层 `.claude/skills/**` 等) 随队列推进渐进出现在 [全局] 视图。
2. **队列顺序**: 最近活跃优先 (lastSeenAt 降序), 单测钉排序。
3. **activate 语义不动**: cache-hit 即时 / miss 后台刷新; `project-scope.e2e.ts` 与 `global-shallow-scope.e2e.ts` 不回归。
4. **前台让位**: 前台 activate/refresh 与后台队列不并发争用 helper; 后台不改写 `runtime.projectDir`; 用户 activate 队列中项目时无双扫 (去重或让位)。
5. **门控统一**: idleOnly/acOnly + pause/resume 统一管辖队列; paused 时队列冻结, resume 恢复。
6. **增量持久化**: 每项目 deep 完成即行级落库 (`replaceBySourceKey`); 冷启 restore 后已 deep 项目资产直接可见。
7. **id 稳定**: entity id 无 churn; `incremental-watch.e2e.ts` 的 `afterId===before.id` 不变量不回归。
8. **进度可见性** (决策⑤): 侧栏 hairline 常驻 (已确认现状有); [全局] scope 且队列未完成时 banner「已索引 N/M, 结果逐步补全」, N 递增, 完成后消失 — **CDP 时序采集验收, 非单帧截图**。
9. **mid-scan 保留合并** (Q1 入批): 扫描期间 watcher 增量不被 partial/commit 整体替换回吐; 单测钉 sourceKey 保留合并。
10. **i18n**: banner 文案 en/zh, 无 raw key 泄漏。
11. **前台性能不牺牲** (决策①): 队列项目间背压; helper OS 节流沿用; CDP 验收期间前台交互无可感卡顿。
12. **门禁**: lint/typecheck/test (根 + engine filter) 全绿; 相关 e2e 本地跑绿 (incremental-watch / project-scope / global-shallow-scope / scan-control / snapshot-persistence); IPC 四方对账绿。

## 界面质量与交互验收

- 现状: hairline 常驻顶栏下沿; 侧栏 footer IndexPulse + hover 进度面板; 列表页有 EmptyState/LoadingState/`shouldShowScanningState`。
- banner: `NoticePanel` info tone; 仅 `mode==='global' && 队列未完成` 渲染, 完成后消失; 文档流内不遮挡内容 (非 overlay); en/zh 文案; 低频订阅 (N/M 项目粒度, 非文件 tick)。
- 状态覆盖: 进行中 (N<M) / 完成 (消失) / 暂停 (保持当前 N/M) / 空候选 (M=0 不渲染)。
- 验收: CDP 时序采集 (N 递增 → 消失) + 冷重启采集瞬态; 避撞 ui-ux 批次热区 (components/dashboard、components/ui、pages/overview|usage|sessions、use-ipc.ts) — banner 为新文件 + app-layout 单行插入, 撞面最小。

## 未决问题

> design 阶段裁决项, 附推荐答案 (用户已授权全程推进, 无 PRD 级歧义 — 产品决策 ①④⑤ 已在 00-PRD 落定; 以下为工程裁决, design 按推荐执行并记录理由)。

- **Q1 mid-scan partial clobber 是否入批** — 推荐: **入批**。队列把单扫瞬态覆盖窗口乘以 M 项目; 修法已在 issue 明确 (扫描期间记录增量 sourceKey 集合, applyPartial/commitScan 保留合并), 改动集中 runtime 单文件 + 单测。不修则本 feature 自己放大已知 bug。
- **Q2 watcher 盲区是否入批** — 推荐: **不入批, 仅交叉引用 + issue 追记**。全部 deep 项目进 watch 集 = 数百 chokidar 根, 资源不可控且与 active-only watch 生命周期冲突; 时效由队列 + 24h 周期扫兜底, 符合决策①「不承诺时限」。
- **Q3 队列重跑策略** — 推荐: 首版**一轮完成即静默**, 周期全量扫兜底; 不持续重排队 (决策①「不牺牲性能/电量」)。
- **Q4 N/M 进度承载** — 推荐: **扩 `AssetRuntimeStatus`** (`backgroundIndex: {indexed, total, state}`), 复用 `assets:progress` 通道与 store 折叠路径, 不新增 IPC channel (省四方对账成本, 语义属 runtime 状态)。

## 交叉引用

- 母 FEATURE: `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` (产品决策 ①④⑤ 已裁决)。
- 旁支: `docs/issues/2026-07-04-BUG-mid-scan-partial-clobbers-incremental-folds.md` (Q1) / `docs/issues/2026-07-04-IMPROVEMENT-watcher-paths-fixed-at-start-blind-spot.md` (Q2)。
- 归档知识: GH-135 (scheduler/helper/设置档位; pause=调度态语义) / GH-151 (replaceBySourceKey + refresh 排队 latest-wins + 120s 看门狗)。
- 测试设施: **全部 8 个 e2e Windows 本地可跑** (launch.ts 隔离 HOME/USERPROFILE); engine 单测 `pnpm --filter @berth/scan-engine test` 与根 `pnpm test` 两套独立命令。
