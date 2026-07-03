# 需求分析 (Explore 产物) — GH-151 综合审查修复批次

> 现状理解基于 2026-07-04 master (65974506 → 5cb57f21) 实读源码。

## 现状理解

### 扫描执行链 (两条, 参数契约必须对齐)

| 链路 | 装配 | scanAll 选项透传 |
|---|---|---|
| 生产 (Electron) | `src/main/index.ts:219` 注入 `HelperAssetScanner` → `ScanHelperHost` (utilityProcess, 长驻) → `src/main/scan-helper.ts` → 引擎 `AssetScanner` | **两处漏 `respectGitignore`** (`helper-host.ts:152-160` 组装 payload、`scan-helper.ts:34-39` 转发) |
| CLI/引擎默认 | `WorkerAssetScanner` → `AssetWorkerHost` (worker_threads, one-shot) → `engine/assets/worker.ts` | 完整 (`worker-host.ts:133`、`worker.ts:24`) |

`AssetWorkerData.respectGitignore` 字段已存在 (`worker-host.ts:22`), adapter 消费点存在 (`claude-code/index.ts:136`) — P0-1 是纯漏传, 两处各补一行 + 防再犯对账测试。

### 调度状态机 (P0-2 核心)

- `ScanCoordinator` (`scan-coordinator.ts`): `inFlight: Promise|null` 单飞; `run()` 并发 join; `cancel()` 置 `cancelled` 标志 + `scanner.cancel?.()` (helper 有 kill, worker 无实现 → 结果被代际 guard 丢弃但 `isScanning` 持续 true 到扫完); `inFlight` 只在 promise settle 后清 (`finally`)。
- `runtime.refresh()` (`runtime.ts:376-413`): **in-flight 时仅 `reason==='project-scope' && !wait` 进 `queuePendingRefresh` (单槽 latest-wins), 其余 reason 静默丢弃**。`flushPendingRefresh` 挂在 `run.finally` (`:408-410`)。
- `rebuild()` (`:442-453`): `cancel()` (同步返回, 但 helper kill 的 exit 事件**异步**才让 runScan reject → `inFlight` 清空滞后 10-100ms) → 清 store/cache/snapshot → **同步** `refresh({reason:'manual'})` → 必然命中 isScanning 早退 + 'manual' 不入队 → 死区实锤。被 kill 的扫描 reject 后走 coordinator `cancelled` 分支静默丢弃, `flushPendingRefresh` 无待办。
- `pause()` (`:418-423`): 置 `schedulerPaused` + cancel in-flight。注意: **`schedulerPaused` 只 gate `schedulePeriodic`, `refresh()`/`flushPendingRefresh` 不看它** — 泛化排队后需处理 "pause 时不 flush", 否则 cancel 引发的 finally 会立刻重启扫描。
- `scheduleRefresh` (`:496-521`): watcher debounce (默认 1s) + minInterval 限速, 到期调 `refresh({reason:'watcher'})` → 落进扫描窗口即被丢 (watcher 变更丢失路径, 兜底 24h 周期扫描且受 idle/battery gate)。

### 跨进程 job 生命周期 (P0-3 核心)

- `ScanHelperHost.ensure()` (`helper-host.ts:66-85`): `spawnPromise` **只在 'spawn' 事件 resolve**; pre-spawn exit 的 `child.once('exit')` 处理只清 `this.child/spawnPromise`, **不 reject** → `runScan` 的 `await ready` (`:89`) 永挂, 且 runScan 的 exit 监听在 await 之后才注册 (`:125`) → cancel 无法解锁。
- `ScanHelperHost.runScan` (`:87-129`): settle 条件 = done/error 消息或 exit 事件。helper **活着但阻塞** (挂死网络盘上的同步 fs、被锁文件) → 永不 settle → `coordinator.inFlight` 永占 → 叠加 P0-2 所有 refresh 被丢 → 全局永久 scanning。progress/partial 消息流现成可当心跳。
- `AssetWorkerHost.runScan` (`worker-host.ts:98-101`): `worker.once('exit', code => { if (settled || code === 0) return; reject })` — **exit(0) 无 done (postMessage 结构化克隆失败 / parentPort null 时 `post` 是 no-op) → 永挂**。对照 helper 侧 onExit 无条件 reject (正确)。
- `scan-helper.ts:76` 的 `setInterval` keepalive 说明 helper 正常路径不会 exit-after-done 竞态; worker one-shot 正常路径 done 先于 exit(0), settled 已 true — worker 侧 `code===0` early-return 唯一命中的就是挂死场景, 可无条件 reject。

### 持久层 (P1-4 核心)

- `SnapshotStore` 契约 (`snapshot-store.ts:4-15`): load/save/clear + 可选 scanHistory 两方法。JSON 后端已删 (GH-115 T13), 生产唯一 sqlite。**加可选 `replaceBySourceKey?` 是干净扩展** (runtime 侧 `store.replaceBySourceKey?.() ?? save()` 降级)。
- `createSqliteSnapshotStore.save` (`sqlite-snapshot-store.ts:95-113`): 事务内 `DELETE FROM asset` + 全量逐行 INSERT + 每资产 stringify。`source_key` 列已建 (`:167`) 且注释自述用途 (`:183-189`), 从未被用。
- 触发链: watcher 增量 → `applyFileChange` (`runtime.ts:905-919`) → `persistIfDefaultView` (`:755-759`, 仅默认视图落盘) → `save()` 全库重写。session 占资产 70%+, 活跃会话每次 transcript 停顿 250ms (`awaitWriteFinish`) 即触发。同步 better-sqlite3 阻塞主进程。
- `getDb()` 失败即永久 `db=null` (`:70-74`) — 本批不修 (审查中列 P2, 见 §旁支发现)。

### raw 与 IPC 负载 (P1-5 核心) — **explore 新发现, 修正审查方案**

- `commitScan` (`runtime.ts:685-694`) 保留 raw 入内存快照; `assets:snapshot` (`handlers.ts:163`) 原样返回 → 全量 raw 过 IPC。
- **审查报告称 "渲染层本就有按需 raw 重读通道" 不准确**: `ViewRawButton` → `assets:get` → `runtime.getAsset(id)` → **`assetMap` 内存快照** (`handlers.ts:232-234`), 无磁盘重读通道; `FileViewerButton` 拿不到内容显示 "rawUnavailable" 无兜底。旁证: 冷启动 SWR 窗口 (持久快照本就 stripRaw) 内 raw 查看本来就是 unavailable, 直到首次扫描 commit。
- **因此 P1-5 方案必须调整**: 不能在 commit 边界剥 raw (会永久弄坏 raw 查看器), 应在 **IPC 投影层**剥 — `assets:snapshot`/`assets:refresh(wait)` 返回与 progress partial (含 `applyFileChange` 的 partial, `runtime.ts:918` 携带完整 merged 列表) 走 lean 投影; `assets:get` (单资产) 继续从内存返回含 raw。`Asset.raw` 是可选字段, 投影不破坏类型契约, **无需增删 IPC 通道** (四方对账不动)。
- `assets:changed` 实发 site: `src/main/index.ts:245-250` watcher 事件逐个直发所有窗口 (payload WatchEvent); 4 个 renderer 订阅方 (`use-ipc.ts:188/345/659`、`use-dashboard-insights.ts:57`) 均忽略 payload、事件到即重发重 IPC。main 侧只有 `assets:progress` 过 coalescer。

### 项目切换缓存 (P1-6 核心)

- `setProjectDir` (`runtime.ts:342-359`): 缓存命中 → `status = {...cached.status, projectDir, state:'ready', stale:false}` 直接返回, **不触发任何刷新**。
- 缓存来源: ① `restorePersistedSnapshot` (`:191`) 把上次运行快照入 cache (状态本是 stale); ② `commitScan:707` 与 `applyFileChange:916` 只写**当前活跃键**; watcher (`watcher.ts:117-124`) 只监听活跃项目的项目级目录 → 非活跃项目的缓存条目天然陈旧。
- `project-scope-runtime.ts:41-43` 仅 `!cached` 时 refresh。`ensureReady` (`:546-550`) 看到 `state:'ready'` 不再补刷。
- 修复语义: 缓存命中继承/标记 stale + 背景刷新 (与冷启动 SWR、cache-miss 路径 (`:361-368` 置 stale) 语义对齐); 需防 A↔B 反复切换的扫描风暴 (min-interval 或复用 scheduleRefresh)。

## 关联与依赖

| 改动面 | 直接消费者 (import/调用点, 符号边界) |
|---|---|
| `runtime.ts` refresh/rebuild/pause/setProjectDir/applyFileChange | `src/main/ipc/handlers.ts` (assets 域)、`src/main/project-scope-runtime.ts`、`engine/assets/watch-wiring.ts`、`src/main/index.ts` (schedulePeriodic/progressListener)、CLI engine-bridge |
| `scan-coordinator.ts` | 仅 runtime.ts + 自身单测 |
| `worker-host.ts` runScan | `WorkerAssetScanner` (CLI/引擎默认) + 自身单测 |
| `helper-host.ts` / `scan-helper.ts` | 仅 `src/main/index.ts` 装配 + `helper-host.test.ts` |
| `snapshot-store.ts` 契约 + `sqlite-snapshot-store.ts` | runtime.ts、`src/main/index.ts:220` 装配、两个 store 单测 |
| `handlers.ts` assets:snapshot/refresh 投影 | preload 类型自动派生 (payload 形状不变, raw 可选) — **无通道增删, 四方对账测试不动** |
| renderer `use-ipc.ts` / `use-dashboard-insights.ts` onChanged | 各页面 hook 消费者; store fold 不变量 (`stores/app.ts`) 不触碰 |

既有测试文件全部就位, 每个修复面都有归属: `agent-asset-runtime.test.ts` (P0-2/P1-5/P1-6)、`scan-coordinator.test.ts` (P0-2)、`helper-host.test.ts` (P0-1/P0-3)、`asset-worker-host.test.ts` (P0-3)、`sqlite-snapshot-store.test.ts` (P1-4)、`watch-wiring.test.ts`、`project-scope-runtime.test.ts` (P1-6)。P0-1 防再犯需一条新的 "helper 链路 options 对账" 测试。

## 任务分类与 debt 校准

- type / maintenance.subtype: bug (无 subtype)
- source.kind / refs: user-request (本会话综合审查, Issue #151)
- debt estimate 修正: 维持 incurred 5 / repaid 4 / net 1
- scope / risk / areas / confidence: cross-process / high / [architecture, performance] / medium — 维持
- revision: 不追加 (explore 证实初始估算; P1-5 方案前提修正不改变影响面量级, confidence 待 design 锁定方案后升 high)

## 验收标准

1. **A1 (P0-1)**: helper 链路端到端透传 `respectGitignore` (helper-host 组装 + scan-helper 转发); 新增对账测试断言两条链路对 `AssetWorkerData`/`scanAll options` 的字段透传集一致, 漏字段即红。
2. **A2 (P0-2)**: ① 扫描进行中任意 reason 的 refresh 不丢失 (latest-wins 排队, 扫描结束自动 flush); ② rebuild 在扫描进行中调用 → 最终必发生一次新全量扫描 (单测钉: 清空后快照最终非 initial 且状态 ready); ③ cancel 后立即 refresh 能启动新扫描; ④ pause 期间不自动 flush 排队项。时序均以可注入 scanner 的单测复现。
3. **A3 (P0-3)**: ① helper pre-spawn exit → runScan reject (不永挂); ② helper 无任何消息超过看门狗窗口 → kill + reject → runtime 状态回 error (可恢复); ③ worker exit (任意码) 且未 settle → reject; ④ 正常扫描 (含慢扫描但有 progress 心跳) 不被看门狗误杀。
4. **A4 (P1-4)**: ① `SnapshotStore` 新增可选 `replaceBySourceKey(sourceKey, assets, envelope)`; sqlite 实现按 `source_key` 行级替换 + envelope 更新, 不触其它行; ② `applyFileChange` 持久化路径改走增量方法 (store 缺失该方法时降级 save); ③ 全量 commitScan 仍走 save; ④ fake-db 单测断言行级行为 (单键替换后其余行原样)。
5. **A5 (P1-5)**: ① `assets:snapshot` / `assets:refresh` 返回、progress partial (含 applyFileChange partial) 均不携带 raw; ② `assets:get` 仍返回 raw, raw 查看器行为不回归 (冷启动窗口除外, 现状即如此); ③ `assets:changed` 消费侧单位时间重 IPC 次数有界 (合并/防抖, 方案 design 定); ④ store fold 不变量与既有渲染层测试全绿。
6. **A6 (P1-6)**: ① 切回已缓存项目: 立即返回缓存快照 (切换仍 sub-second) 且 status 标 stale; ② 随后自动触发一次背景刷新, 完成后快照更新 (SWR); ③ A↔B 反复快速切换不产生扫描风暴 (单飞 + 限速语义可测)。
7. **A0 (全局门禁)**: `pnpm typecheck` / `lint` / `test` / `harness:check` 全绿; 每项实现先写/更新目标测试 (不变量 16)。

## 界面质量与交互验收

本批以引擎/主进程为主, renderer 仅 P1-5 的 onChanged 消费合并, 无新 UI。数据流/时序类可观测验收点 (不变量 22, verify 阶段 dev 实例 + CDP 真跑):
- 扫描进行中点 "重建索引" → 进度最终到达 ready 且资产数非 0 (P0-2)。
- 活跃会话高频落盘时 Overview 不再逐事件全量重取抖动 (P1-5)。
- 切换项目 scope: 先即时显示缓存数据, 随后自动后台更新 (P1-6)。
- 加载/空/错误态: 看门狗触发后状态回 error, UI 呈现可重试而非永久 scanning (P0-3)。

## 未决问题

无 PRD 级歧义, 以下由 design 阶段裁决 (不 block):
- Q1 (P1-5): changed 合并落点 — main 侧 trailing coalesce (一处修所有订阅方) vs renderer 侧 4 处防抖。倾向 main 侧; design 需核对 IpcEvents payload 语义 (4 个消费者均忽略 payload, 合并后发最后一个 WatchEvent 即可) 与 ipc-registration 测试是否钉逐事件行为。
- Q2 (P1-6): 背景刷新节流 — 立即 `refresh({wait:false})` vs 复用 `scheduleRefresh` minInterval。倾向后者。
- Q3 (P0-3): 看门狗窗口默认值 — 倾向内部常量 (60-120s 无消息判挂) + 构造注入可测; **不加 GUI 设置** (避免再造安慰剂设置反模式)。
- Q4 (P0-2): 扫描中 `wait:true` 的语义 — "等当前 in-flight 完成即返回" (现状) vs "等本请求对应的新扫描完成"; rebuild(wait:true) 的正确性依赖此裁决, design 定义并钉测试。

## 旁支发现 (不入本批, 归档时按 5.2-issues 沉淀)

审查报告 P2/P3 项: typed registerHandler + sender 校验、IpcEvents typed emit、mock 对账双向全等、MiniSearch snapshot.id 判脏、`getDb()` 瞬态锁永久放弃、退出路径 SQLite close/WAL checkpoint、memory/agent-teams 吞错集群、uncaughtException 弹框无节流、watcher 路径集启动定死、电池初始状态 seed、`session-replay.ts` NUL 字节、安慰剂设置 (scanConcurrency/minFreeDiskMb/contentHash)、`getEngineInfo` 能力元数据失真、worker 链路 cancel 未实现、DRY 收敛族 (session meta 尾块/hook occurrence/工具双份/stripRaw 双实现)、巨石文件拆分、sessions O(n²) 分组、useUsageSummary 无去重、AppLayout 全量订阅、测试 fixture 样板。
