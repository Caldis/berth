# 需求分析 (Explore 产物)

> 2026-06-12。来源: 00-PRD.md (issue asset-runtime-collaborators-split)。链 ② (① GH-121 已归档, runtime 现位于 `packages/berth-scan-engine/src/engine/assets/runtime.ts`, 591 行)。

## 现状理解

### 职责块行级映射 (2026-06-12 全文精读)

| 职责 | 现位置 (runtime.ts) | 拆分去向 |
|---|---|---|
| **SelectorCache** | `SnapshotSelectorCache` 类 (82-97) + `AssetSelectorCache` 接口 (67-70) — **已是独立类, issue 三协作者之一已半成**, 只差物理出文件 | `selector-cache.ts` 纯平移 |
| **ProjectSnapshotCache** | `snapshotCache: Map` (109) + `projectKey()` (100-102) + setProjectDir 命中逻辑 (216-222) + set 散布 ×3 (restorePersistedSnapshot:155 / runRefresh:404 / applyFileChange:512) + `hasSnapshotFor` (204-206) | `project-snapshot-cache.ts` — get/set/has + projectKey 内聚, 消灭 5 处裸 Map 操作 |
| **ScanCoordinator** | scanner 持有/换代 (110/130/212) + `inFlight` (114, refresh 240-262) + `runRefresh` 执行段 (365-439) + **generation guard `isCurrent`** (370-371, GH-111 R4) | `scan-coordinator.ts` — 持 scanner 生命周期 + in-flight 去重 + 扫描执行; 状态写回经 outcome 回调交还 runtime (边界设计见未决 Q1) |
| 状态机 (idle/stale/scanning/ready/error 转移) | refresh/setProjectDir/runRefresh/restore 散布 | **留 runtime** (编排壳核心) |
| 快照折叠 (applyPartial/applyFileChange) | 462-518 | 留 runtime (写路径, 与状态机同生命周期) |
| 领域查询 (search/health/usage/sessions) | 293-363 (select 消费方) | 留 runtime (IPC 读路径门面; issue 只点名三协作者) |
| 持久化策略 (仅默认/global 视图落盘) | initialProjectDir 比较 ×2 (408-410/513-516, 重复习语) | 留 runtime, 拆分时可收敛为私有谓词 (顺势, 非目标) |

### 行为硬约束 (不变量, 全部有测试钉)
1. **快照 ID 稳定**: applyPartial/applyFileChange 不换 id, 仅 runRefresh 完成 mint (注释 474-479/497-499 明示; 测试 "keeps the snapshot id stable" 钉)。
2. **scope 无重扫**: setScopeSelection 仅清 selector 缓存 (198-201); setProjectDir 缓存命中即出不扫 (216-222; 测试 "serves a cached snapshot" 钉)。
3. **R4 generation guard**: 项目切换换 scanner 后, 旧扫描的一切状态写入被 `isCurrent()` 拦截 (测试 "discards a mid-flight scan" 钉)。
4. **P4.6 终态保序**: ready/error 必须经 progress 通道补发为最后事件 (测试 ×2 钉)。
5. **device-wide health**: 健康检查无视 scope (产品决策, 注释 308-317 + 测试钉)。
6. **持久化只存默认视图** (T1, 测试钉)。

### 测试网 (拆分红绿网, 现成)
- `tests/unit/agent-asset-runtime.test.ts` 496 行 **24 用例**逐一覆盖上述全部锚点 (idle 起步/in-flight 复用/selector 缓存/progress 映射/partial 折叠/终态保序 ×2/R4/error 留 stale/scope search ×2/缓存切换/冷启动/持久化策略/device-wide/applyFileChange 全家 7)。已在 tsconfig.test 纳管 (不在 GH-115 渐进 exclude 账本)。
- 周边: watch-wiring / sqlite-snapshot-store / project-scope-runtime 各有直测; 全量 1050。

### 消费面 (公共 API 不变 = 兼容判据)
- 两个消费者已用**窄接口**消费 (好先例, 拆分天然兼容): `watch-wiring.ts` 的 `WatchableRuntime` (3 方法: getProjectDir/applyFileChange/refresh); `src/main/project-scope-runtime.ts` 的 `AssetRuntime` (6 方法)。
- `src/main/ipc/handlers.ts` 直接消费 getAssetRuntime() 实例方法 (snapshot/status/refresh/scanSourceGroups/getAsset/search/healthCheck/usage/sessions/ensureReady/getProjectCandidates/setScopeSelection/getSnapshot)。
- `src/main/index.ts`: initAssetRuntime/getAssetRuntime/setProgressListener。
- → 拆分为**内部协作者** (不改 AgentAssetRuntime 公共方法签名), 全部消费面零改动。

## 关联与依赖

- 上游: GH-121 (包内, root typecheck 已纳管包源码 — 拆分断链即红); SnapshotStore 已独立 (snapshot-store.ts / sqlite-snapshot-store.ts, drop-in 契约先例)。
- 下游: 链 ③ indexer 主线 — ScanCoordinator 即长驻 worker/调度背压的落点; 本拆分为其腾出清晰边界, **不在本任务实现任何调度功能**。
- blast radius: 仅包内 `engine/assets/` 新增 2-3 文件 + runtime.ts 缩减; 消费面/IPC/renderer/preload 零改动; 测试预期零改动 (24 锚点测试逐字不动全绿是 AC 核心)。

### GH-121 残项复核 (PRD 列同窗项, 逐项判定: **全部不纳入**, 聚焦三协作者)
- adapter scanAll 接 sources 表 / conventions 双表 / session capability map 契约化 — adapters 域改动, 与本拆分不同文件域; ARCHITECTURE 例外清单在册, 独立小批。
- tsup publishConfig / 桶导出 — 发布形态, 源码 alias 消费态下无急迫。
- watcher resolveClaudeManagedDir 中立化 — 同包后跨域引用已合法化, 诉求弱化。
- project-scope-runtime 归位 (R33) — 它消费 runtime 窄接口 + watcher, 是 main 侧编排件, 现位置成立; 不动。

## 任务分类与 debt 校准

- type / maintenance.subtype: maintenance / architecture — 维持。
- source.kind / refs: docs-issues — 维持。
- debt estimate 修正: 数值维持 incurred 2 / repaid 5 / net -3。
- scope / risk / areas / confidence: module / high / [architecture] 维持; **confidence low→medium** (591 行职责块行级映射完成 + 24 用例红绿网现成 + SelectorCache 已半成 + 消费面窄接口先例)。
- revision: 已追加 INDEX `debt.revisions[]`。

## 验收标准

1. **AC-1 三协作者物理成文件**: `selector-cache.ts` / `project-snapshot-cache.ts` / `scan-coordinator.ts` 位于 `engine/assets/`, runtime.ts 不再含 SnapshotSelectorCache 类体、裸 snapshotCache Map 操作与 runRefresh 扫描执行体。
2. **AC-2 runtime 缩减为状态机+编排**: runtime.ts 职责剩状态机转移、快照折叠、领域查询门面、协作者编排; 行数显著缩减 (目标 ≤ ~400)。
3. **AC-3 公共 API 零变更**: AgentAssetRuntime 全部公共方法签名不变; 消费面 (handlers/index/watch-wiring/project-scope-runtime) 零改动 (git diff 实证)。
4. **AC-4 行为零变更**: `agent-asset-runtime.test.ts` 24 用例**逐字不动**全绿 (六大不变量锚点); 全量 1050 双轮绿; e2e 全量绿 (win32 已知项口径); 包 24 测绿。
5. **AC-5 协作者可直测**: 新协作者各有独测 (SelectorCache 平移可复用既有断言; ProjectSnapshotCache/ScanCoordinator 新增最小直测 — 解决 issue 点名的"测试只能整体 mock"痛点)。
6. **AC-6 门禁**: typecheck (root 纳管包) / lint / test / e2e / CI 含包三步全绿。

## 界面质量与交互验收

不适用 (包内纯结构重构, 零 UI/IPC 改动; 行为零变更由 AC-4 钉死)。

## 未决问题

- **Q1 ScanCoordinator↔runtime 状态写回边界** (design 主决策, 两案已盘):
  - A. coordinator 仅执行 + 回调 (`run(scanner, {onProgress,onPartial,commit,fail})`), generation guard 留 runtime — 改动最小但 guard 语义仍糊在 runtime;
  - B. coordinator 持 scanner 生命周期 (swap(projectDir) 换代), isCurrent 内化为 coordinator 代际检查, runtime 经回调收 outcome — guard 语义归位, 链 ③ 落点更净。倾向 B, design 细化回调契约后定。
- **Q2 ProjectSnapshotCache 是否连带持有 assetMap 重建**: 现 setProjectDir 命中时同步重建 assetMap (219); 缓存条目可含预建 map 或保持 runtime 重建 — design 按"缓存只存数据不存派生"原则定, 倾向后者。

## 旁支发现 (不入本任务范围)

- 持久化谓词重复习语 (408/513) — 拆分时顺势收敛为私有方法 (同文件内, 非范围外)。
- `createDefaultSnapshotId` 用 `Date.now()+Math.random()` (560-562) — 注入点已存在 (createSnapshotId option), 无问题, 仅备注。
