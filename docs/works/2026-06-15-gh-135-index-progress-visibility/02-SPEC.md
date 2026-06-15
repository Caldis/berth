# 技术方案 (Design 产物) — GH-135 索引引擎进度可视化与可控性

每条回指 01-ANALYSIS 验收标准编号 (AC-1..AC-8)。本 SPEC 修正 01-ANALYSIS §2.2 的真源归属判断, 见 §0。

## 0. 设计决策与对 01-ANALYSIS 的修正

**核心架构 = 方案 X (真源留 main runtime, helper 仅扫描执行器)**。helper-research 证据: sqlite 持久化当前就在主进程 (`index.ts:205`), worker 只做 CPU 扫描回传 `AssetWorkerScanPayload`, 不碰库。据此最优解是:
- **helper 进程** = 纯扫描执行器 (scanner.scanAll, 长驻, file-cache 留进程内), 拿 OS 节流 + 崩溃/内存隔离 + 真 kill。
- **main 进程的 `AgentAssetRuntime`** = engine 单一真源: snapshot / status / settings / scheduler / ETA / category stats / fold 业务逻辑全在此; sqlite 持久化在此。
- **renderer (GUI)** = 纯投影: 订阅 engine 状态渲染, 命令式写, 无真源无业务逻辑。

这比 01-ANALYSIS §2.2 设想的"真源在 helper + main 持镜像"**更简单**: 不需要双层镜像同步, main runtime 仍是唯一真源, helper 只是把现在 worker 的角色升级为长驻独立进程。**用户"数据维护在 engine"约束满足**: engine 真源 = main runtime (`@berth/scan-engine` 跑在 main), GUI 投影; helper 是 engine 的扫描子进程 (engine 内部实现)。

**设计假设 (消解 01-ANALYSIS 未决问题, 不再打断用户)**:
- **Q1 下次扫描周期**: chokidar 增量实时为主 + 周期全量兜底 (默认 24h, 可配/可关) + 空闲优先。`nextScanAt` = 上次完成 + interval。
- **Q2 暂停语义**: "暂停 = 停周期调度 + 取消当前扫描 (保留已扫); 恢复 = 恢复调度"。worker/helper 难真挂起当前扫描, UI 文案明确"已扫结果保留, 暂停期间不自动重扫"。暂停是调度态 (`scheduler.paused`), 非扫描态。
- **Q3 信息架构**: 3 档预设 (eco/balanced/performance) + 展开"高级"裸值; 改裸值则 preset→custom。检索强烈建议防误配。

## 1. 架构总览 (三进程)

```
helper 进程 (utilityProcess, serviceName=berth-scan-helper, 长驻单例)
  scanner.scanAll (CPU 扫描) · file-cache 进程内状态 · 收 scan/cancel 命令 · 回传 progress/partial/done/error · 自降 os.setPriority
        ↕  parentPort postMessage (structured clone, payload 去 cache 字段)
main 进程 (engine 真源 + 桥)
  AgentAssetRuntime [真源: snapshot/status/settings/scheduler/eta/stats/fold] · sqlite (berth-index.db)
  helper-host [fork/kill/崩溃自愈 + OS 节流施加 taskpolicy/ionice] · 周期 timer · powerMonitor · IPC handlers
        ↕  preload typed invoke (命令) / subscribe (assets:progress, assets:changed 推送)
renderer (GUI 纯投影)
  store [只读投影, 无 fold/无业务逻辑] · 订阅渲染 · 用户操作=命令 IPC
```

## 2. 数据契约 (`packages/berth-scan-engine/src/shared/types/ipc.ts`) — AC-1/4/6/7

### 2.1 ScanEngineSettings 扩展 (全 B 策略参数)
```ts
type ScanEnginePreset = 'eco' | 'balanced' | 'performance' | 'custom'
interface ScanEngineSettings {
  preset: ScanEnginePreset            // 当前档; 改任一裸值 → 'custom'
  // watcher (现有)
  watcherDebounceMs: number           // 1000
  watcherMinIntervalMs: number        // 30000
  // 调度
  periodicScanEnabled: boolean        // true
  periodicScanIntervalMs: number      // 86400000 (24h); 0=关
  idleOnly: boolean                   // false (true=仅空闲触发周期扫)
  idleThresholdMs: number             // 60000
  // 性能 / 背压
  scanConcurrency: number             // 2 (min(4,cpu/2))
  batchPauseMs: number                // 50 (adapter 间 sleep, IO 节流核心)
  // 电源 / 资源门控
  acOnlyFullScan: boolean             // true (电池只增量)
  minFreeDiskMb: number               // 1024; 0=关
  // 范围 (最高杠杆)
  excludePaths: string[]              // 用户列表 (内置 node_modules/.git/*.tmp 在 engine 常量, 不入 settings)
  respectGitignore: boolean           // true
  contentHash: boolean                // false (mtime+size 判变)
  // OS 节流 (helper)
  osThrottleEnabled: boolean          // true (mac taskpolicy / linux ionice; win 无效, future)
}
```
> `batchSize` / `cpuLimitPercent` / `memLimitMb` 列入 §8 background 项但**本期不进 settings UI** (engine 内部用 batchPauseMs+concurrency 已覆盖主杠杆; cpu/mem 上限需反馈式采样, 复杂度高), 写入 docs/issues 后续。避免 11 参数一次铺满 UI。

### 2.2 AssetScanProgress 扩展 (engine 算好, 单一真源) — AC-1
```ts
interface AssetScanProgress {
  phase: 'discovering' | 'parsing' | 'indexing' | 'deriving'
  current: number; total: number; label?: string
  scannedAssets?: number   // 真实已扫资产数 (engine 填, = partial.assets.length)
  elapsedMs?: number       // 已用时长
  etaMs?: number           // 预计剩余 = max(0, lastScanDurationMs - elapsed); 无基线→undefined→UI indeterminate
  ratePerSec?: number      // scannedAssets / (elapsed/1000)
}
```

### 2.3 ScanEngineSchedulerSnapshot 扩展 — AC-1
```ts
interface ScanEngineSchedulerSnapshot {
  scanning: boolean
  paused: boolean                                    // 新增: 用户暂停调度
  scheduledRefresh: {...}; queuedRefresh: {...}       // 现有
  periodicScan: { enabled: boolean; intervalMs: number; nextScanAt?: string }  // 新增: "下次扫描周期"
  lastWatcherRefreshStartedAt?: string
  lastScanDurationMs?: number                         // 新增: ETA 基线
}
```

### 2.4 ScanEngineControlDescriptor 扩展 (支持非 number 控件) — AC-4
```ts
interface ScanEngineControlDescriptor {
  id: ScanEngineControlId; value: string | number | boolean | string[]
  kind: 'number' | 'boolean' | 'string-list' | 'enum' | 'readonly'   // 新增
  group?: 'preset' | 'schedule' | 'performance' | 'scope' | 'power' | 'watcher'  // 新增分组
  options?: readonly string[]    // enum (preset 档位); 新增
  unit?; editable; supported; settingKey?; min?; max?; step?           // 现有
}
```

### 2.5 IpcChannels 新增命令 (四方对账: 表 + handlers + preload + tests/setup mock) — AC-6
```ts
'assets:pause':   { args: []; result: ScanEngineInfo }       // 停调度 + 取消当前
'assets:resume':  { args: []; result: ScanEngineInfo }       // 恢复调度
'assets:cancel':  { args: []; result: AssetRuntimeStatus }   // 取消当前扫描, 保留已扫
'assets:rebuild': { args: []; result: AssetRuntimeStatus }   // 清 db + 全量重扫 (warning 在 GUI)
```
> preset 走现有 `assets:set-engine-settings` ({ preset } 或裸值 patch), 不单开 channel。

### 2.6 capabilities 翻转 (helper 架构后)
`pauseSupported:true · cancelSupported:true · workerMode:'long-lived' · schedulerMode:'priority-queue'`; 新增 `osThrottleSupported: boolean` (platform!=win32 && osThrottleEnabled)。

## 3. 数据流协议 (engine 真源 / GUI 投影) — AC-6

| 维度 | 规则 |
|---|---|
| **真源** | `AgentAssetRuntime` (main) 唯一持有 snapshot/status/settings/scheduler。helper 无状态真源 (只 file-cache 加速)。 |
| **业务逻辑归属** | `foldKeepingShallow` (现 `store/app.ts:79`)、category stats、ETA/rate 计算、preset 解析 **全部上提 main runtime**。renderer 删除这些。 |
| **下行 (engine→GUI)** | runtime commit/partial/status 变化 → `progressListener` → main broadcast `assets:progress` → preload subscribe → store 投影 set (纯赋值, 无变换)。 |
| **上行 (GUI→engine)** | 用户操作 = 命令 IPC (`refresh`/`pause`/`resume`/`cancel`/`rebuild`/`set-engine-settings`) → handler → runtime 改真源 → 下行推送。GUI 永不本地改数据。 |
| **store 定位** | renderer `store/app.ts` 退化为只读投影容器: `assets/stats/status/scheduler/engineInfo` 字段 = engine 推送的快照, 无 fold/无计算。SWR 缓存 (`use-ipc.ts` CachedResource) 保留为投影缓存, 但不在缓存层做业务变换。 |
| **multi-window** | 所有窗口订阅同一 broadcast, 天然一致 (现状已是, 维持)。 |

## 4. helper 进程方案 (`worker-host.ts` → `helper-host.ts`) — AC-5

落地按 helper-research 6 步 (官方文档背书):
1. **helper 入口** `engine/assets/scan-helper.ts` (改造 worker.ts): `worker_threads` API → `process.parentPort`; 初始数据从 `workerData` 改为 spawn 后首条 `postMessage({type:'scan', data})`; 干完**长驻不退出**等下一命令; 消息协议 `AssetWorkerMessage` 联合不变 (+ `cancel`)。
2. **host 改造** `helper-host.ts`: `new Worker` → `utilityProcess.fork(forkPath, [], {serviceName:'berth-scan-helper', execArgv:['--max-old-space-size=512']})`; `worker.on(message/error/exit)` 平移 `child.on(...)`; 入口 `import forkPath from './scan-helper?modulePath'` 替 `__dirname` 拼接。保留 `createChild` 注入接缝 (测试注入假 child)。
3. **长驻单例 + cancel**: host 持模块级单例 child, 多次 scanAll 复用; `cancel()` → `child.kill()` (SIGTERM 硬终止) 后按需重 spawn。
4. **持久化不动**: sqlite 留 main; helper 只回传 `scanResult/sources/projectCandidates`; **payload 去掉 `sessionCache/projectScanCache` 字段** (file-cache 留 helper 进程内, 规避 MB 级跨进程往返)。
5. **OS 节流 (路径 A)**: `child.on('spawn')` 拿 `child.pid` → 按平台 `execFile`: macOS `taskpolicy -b -p <pid>`; linux `ionice -c3 -p <pid>` + `renice -n 19 -p <pid>`; helper 内 `os.setPriority(0,19)` 兜底 CPU。CLI 缺失/非零 → 降级仅 setPriority, 不阻断扫描。`osThrottleEnabled=false` 跳过。
6. **崩溃自愈 + 清理**: `app.on('child-process-gone')` 判 `serviceName==='berth-scan-helper'` 且 `reason!=='killed'` → 标记失效, 下次 scan 重 spawn; `app.on('before-quit', ()=>child?.kill())`。

打包: 删 `electron.vite.config.ts` 手写 `'asset-worker'` input, 改 `?modulePath`; `externalizeDepsPlugin` 不变 (helper 不依赖 native); electron-builder smartUnpack 零改。

## 5. 参数 schema + 3 档预设 (`engine/assets/settings.ts`) — AC-4
- `DEFAULT_SCAN_ENGINE_SETTINGS` 扩展全字段 (§2.1 注释默认值); `SCAN_ENGINE_SETTING_LIMITS` 补 number 字段 min/max/step。
- `SCAN_ENGINE_PRESETS: Record<'eco'|'balanced'|'performance', Partial<ScanEngineSettings>>`:
  - eco: concurrency 1 / batchPauseMs 150 / interval 7d / acOnlyFullScan true / idleOnly true
  - balanced: concurrency 2 / batchPauseMs 50 / interval 24h / acOnlyFullScan true / idleOnly false
  - performance: concurrency 4 / batchPauseMs 0 / interval 6h / acOnlyFullScan false / idleOnly false
- `normalizeScanEngineSettings`: clamp + step 对齐 (现有) + 扩展 boolean/string[] 字段 + `applyPreset(preset)` 合并; 改裸值后 `preset='custom'`。
- `getEngineInfo().controls[]` 按 §2.4 输出 group/kind, GUI 自动渲染对应控件。

## 6. 控制状态机 (`runtime.ts`) — AC-2/3
| 命令 | 前置 | 动作 | status/scheduler 结果 |
|---|---|---|---|
| `pause` | — | `scheduler.paused=true`; scanning 则 `cancel()` | scanning→stale (保留已扫); 不再周期扫 |
| `resume` | paused | `scheduler.paused=false`; 重排周期 timer | 按 schedule 下次扫 |
| `cancel` | scanning | helper `kill()`; partial 已 fold 进 snapshot | scanning→stale (保留已扫已扫数据安全) |
| `rebuild` | — (GUI 已确认) | `snapshotStore.clear()` (DELETE asset+meta) + 清 in-memory snapshot + `refresh({reason:'manual', wait})` | →scanning→ready (全新) |
- `SnapshotStore` 接口加 `clear(): void`; sqlite 实现 `DELETE FROM asset; DELETE FROM snapshot_meta` (事务, best-effort)。
- rebuild 破坏性 (清空已索引 + 全量重扫 ~10s), **warning 在 GUI** (§9 对话框), engine 端不弹窗只执行。

## 7. ETA + 周期调度 + 背压 — AC-1/5
- **ETA**: runtime 记 `lastScanDurationMs` (commit 时 = completedAt - startedAt); 扫描中 `etaMs = max(0, lastScanDurationMs - elapsedMs)`; 首次无基线 → undefined → UI indeterminate。engine 算, 放 progress。
- **周期调度**: runtime 递归 `setTimeout` (非 setInterval 防重叠); commit 后排下次 (`nextScanAt = now + intervalMs`); `idleOnly` 时到点先查 `powerMonitor.getSystemIdleTime()*1000 >= idleThresholdMs` 否则顺延; `acOnlyFullScan && powerMonitor.onBatteryPower` 时跳过全量。paused 时不排。
- **背压**: scanner for 循环 adapter 间 `await sleep(batchPauseMs)` + 排除路径过滤 (scanner 入口先剔 excludePaths/.gitignore); concurrency 本期串行→并发由 batchPauseMs 调节 (并发池列 background, 见 §5 注)。OS 节流 §4.5 互补。

## 8. 模块结构 / 组件拆分 (遵守 ARCHITECTURE 边界 + 进程隔离)
- engine 保持 electron-free (runtime/scanner/settings/snapshot-store); helper-host 持 electron (utilityProcess), 与现 worker-host 同层。
- main `index.ts`: helper 生命周期 + 周期 timer + powerMonitor + OS 节流 execFile + before-quit 清理。
- renderer: `use-ipc.ts` 加 pause/cancel/rebuild/resume actions + onProgress→loadInfo 节流 (rAF 或 250ms throttle, 防每 tick reload); store 去 fold; 新增 `ScanControlBar` (暂停/取消/重建) + `RebuildConfirmDialog`; `ScanProgressPanel`/`ScanEngineSettingsSection` 扩展。

## 9. 界面质量与交互验收 — AC-1/7/8

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 进度: sidebar hover 面板加 ETA/速率/下次时间行 (现有 Progress+phase 下方); 设置: controls 按 group 折叠分组 (preset 档位卡在顶, 高级裸值默认折叠), 避免 16 参数平铺 | CDP 截图请用户确认; 信息密度对照现有 4 列 metrics |
| 组件选择 / 设计系统一致性 | 复用 `Chip`/`Progress`/`FloatingPopover`/`border-destructive` (rebuild); 控件 kind→toggle(switch)/number input/string-list(tag input)/enum(segmented); 延续 index-breathe 脉冲语言, **不引入 gray slab / card-box 堆叠 / loud blue** (memory: berth-frontend-design-taste) | 视觉 quiet/refined, 用户确认 |
| 交互反馈 / 状态切换 | 暂停/取消/重建即时反馈 (按钮 disabled+spinner); paused 态 sidebar 显"已暂停"非 idle; 下次扫描时间倒计时 | CDP 真跑观察状态流 (runtime-behavior-needs-real-run) |
| loading/empty/error/disabled/focus | paused 态视觉; rebuild destructive 对话框 (focus trap+Esc, 双确认: 标题点破坏性+耗时); 控件 saving/disabled/focus ring (现有) | 逐态截图 |
| 响应式 / a11y / 键盘 | 控制按钮 aria-label + 键盘可达; 对话框 role=dialog+focus trap; 现有 role=status/aria-live 维持 | 键盘走查 |
| 文案 / i18n / 数字路径格式 | en+zh 全 key (settings.scanEngine.* 参数标签/描述/预设/控制按钮/rebuild 警告; nav.scanStatus.* ETA/速率/下次时间); 数字 Intl.NumberFormat; 时间 Intl.DateTimeFormat (现有 formatDate) | i18n key 双语完整, 无 raw key |

## 10. 测试策略 (测试矩阵) — 每实现项有测试证据或例外

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 备注 |
|---|---|---|---|---|
| settings 扩展 normalize + preset 应用 + clamp | unit | `engine/assets/settings.test.ts` | `pnpm --filter @berth/scan-engine test` | 纯函数, 全分支 |
| SnapshotStore.clear (sqlite DELETE) | unit | `engine/assets/sqlite-snapshot-store.test.ts` | 同上 | 注入假 Database 验 DELETE |
| runtime pause/resume/cancel/rebuild 状态机 | unit | `engine/assets/agent-asset-runtime.test.ts` | 同上 | 注入假 scanner; 验 status/scheduler 转移 + clear 调用 |
| ETA / lastScanDuration / nextScanAt 计算 | unit | 同上 | 同上 | 注入 now()/duration |
| 周期调度 timer + idle/AC 门控 | unit | 同上 | 同上 | 注入假 powerMonitor + fake timer |
| 背压 batchPauseMs + 排除路径过滤 | unit | `engine/scanner.test.ts` | 同上 | 注入 sleep spy + 假 fs |
| helper-host fork/命令/取消/崩溃 (utilityProcess) | unit | `engine/assets/helper-host.test.ts` | 同上 | 注入假 child (on/postMessage/kill); 协议 mock |
| IPC 契约四方对账 (新 4 channel) | unit | `tests/unit/ipc-contract.test.ts` + `tests/setup.ts` | `pnpm test` | 表==handlers==preload==mock |
| GUI 投影 (store 去 fold, 命令派发) | renderer | `stores/app.test.ts` / `hooks/use-ipc.test.ts` | `pnpm test` | 验 store 纯投影 + actions 发命令 |
| 进度可视化随时间变化 (ETA/数量/下次时间) | e2e (CDP 时序) | `tests/e2e/scan-progress.e2e.ts` | `pnpm test:e2e` | 真跑断言 observable 流 (runtime-behavior-needs-real-run) |
| pause/cancel/rebuild 端到端 + 数据安全 | e2e | `tests/e2e/scan-control.e2e.ts` | 同上 | 取消保留已扫; rebuild 清空重扫 |
| helper 崩溃自愈 (kill 后重 spawn) | e2e | 同上 | 同上 | 杀 helper 验恢复, 主窗口不崩 |
| OS 节流施加 (mac/linux pid 优先级) | manual | — | 真机 `taskpolicy`/`ionice` 验 helper pid | OS 行为静态推不出, 真机抽验 (区分平台) |

## 11. 验收标准映射
| SPEC 项 | ANALYSIS 验收 |
|---|---|
| §2.2 progress+ETA / §7 周期 / §9 进度面板 | AC-1 |
| §6 pause/cancel 状态机 / §4 helper kill | AC-2 |
| §6 rebuild + clear / §9 警告对话框 | AC-3 |
| §2.1 settings / §5 预设 / §9 设置面板 | AC-4 |
| §4 helper 进程 / §4.5 OS 节流 / §4.6 崩溃自愈 | AC-5 |
| §3 数据流协议 / §0 真源归属 | AC-6 |
| §2.5 channels / §10 ipc-contract | AC-6 |
| §9 UI 验收表 / memory taste | AC-7/8 |

## 12. 任务分类与 debt
- type: feature; source.kind: user-request; refs: 母 FEATURE 2026-06-07-background-progressive-asset-indexer。
- debt.estimate: incurred 12 / net 12 / scope cross-process / risk high / areas [architecture, ui-ux] (见 INDEX revisions; design 维持 explore 估算, 方案 X 反而降低 main↔helper 双层镜像复杂度, 但未低于 12 因 helper 迁移 + 全参数 + 数据流上提仍是大面)。
- debt.final 预期: incurred ~12, repaid ~2 (并掉母 FEATURE 长驻 worker 主线 + 消灭每轮 new Worker/双向 clone), net ~10。
- Project 字段同步: design 阶段 risk high / architecture 已在 INDEX; implement 收尾再校。
- `pnpm harness:stats` 总 debt=7 (<40), 非 maintenance 任务继续无需 override。
