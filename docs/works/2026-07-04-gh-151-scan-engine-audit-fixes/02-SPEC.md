# 技术方案 (Design 产物) — GH-151

每条回指 01-ANALYSIS 的验收标准编号 (A0-A6)。

## 任务分类与 debt

- type / maintenance.subtype: bug (无 subtype)
- source.kind / refs: user-request (本会话综合审查, Issue #151)
- debt.estimate: incurred 5 / repaid 4 / net 1 / cross-process / high / [architecture, performance] — 数值维持
- debt.final 预期: 与 estimate 持平 (方案不扩面: 无新 IPC 通道、无 schema 迁移、无第三方依赖)
- revisions: design 后 confidence medium → high (四个裁决点全部落定, 无外部契约依赖, 测试矩阵齐)
- Project 字段同步: `node scripts/harness-projects.mjs ensure` 已同步; archive 时 done 收口
- 总 debt 27 (<40), 无需 override 说明

## 裁决记录 (01-ANALYSIS 未决问题, 无需用户澄清, 写明假设)

- **Q1 → main 侧 trailing 合并**: `assets:changed` 在 `src/main/index.ts` 发送处过一个 trailing 定时合并器 (窗口 250ms, latest-wins)。理由: 一处修所有 4 个订阅方与未来订阅方; 4 个消费者均忽略 payload (grep 证实), 合并后发最后一个 WatchEvent 语义不变; `IpcEvents` payload 类型不动。`ProgressCoalescer` 是为同步紧循环设计的时间门控 (无 timer, 依赖 flush), 不适配异步 fs 事件流 → 新增 ~20 行 timer 版 `TrailingCoalescer` (engine, electron-free, 直测)。注意: `applyWatchEvent` (增量折叠) 仍逐事件执行, **只合并广播**。
- **Q2 → 复用 ensureReady SWR, 不加新刷新调用点**: P1-6 缓存命中标 stale 后, `activateProjectScope` 尾部的 `getProjectCandidates()` (`project-scope-runtime.ts:52`) 本身就是派生读 → `ensureReady` 看到 stale 自动 kick 背景 refresh。风暴控制 = 新鲜度 TTL (下述) + coordinator 单飞 + P0-2 的 latest-wins 队列。
- **Q3 → 看门狗为内部常量 + 构造注入**: 无消息不活动窗口默认 120s (`SCAN_INACTIVITY_TIMEOUT_MS`), 任何 message (progress/partial/done/error) 重置计时。不进 GUI 设置 (避免安慰剂设置反模式)。helper 与 worker 两 host 对称实现, timer 经构造可注入 (测试用 fake timers)。
- **Q4 → wait:true 在扫描中 = 等到排队的新扫描完成**: `queuePendingRefresh` 维护单个 deferred; `flushPendingRefresh` 完成后 resolve。`rebuild(wait:true)` 因此语义正确 (等新扫描)。`cancel()`/`pause()` 清空队列时 resolve deferred (返回当时 status), 避免 IPC 调用方永久悬挂。

## 数据契约

1. **`SnapshotStore` 契约扩展** (A4, `snapshot-store.ts`): 新增可选方法
   `replaceBySourceKey?(sourceKey: string, assets: Asset[], envelope: AssetSnapshot): void`
   — 语义: 删除 `source_key = ?` 的行, 插入 `assets` (内部 stripRaw, ord 续 max+1), 覆写 envelope meta; 其余行不动。空 `assets` = 纯删除。runtime 侧 `store.replaceBySourceKey?.(...) ?? store.save(...)` 降级, JSON 测试 store 无需实现。
2. **两条扫描链路的 options↔payload 映射单源** (A1, `worker-host.ts`): 新增两个纯函数
   - `workerDataFromScanOptions(options, base): AssetWorkerData` — scanner 侧组装 payload (HelperAssetScanner 与 WorkerAssetScanner 共用);
   - `scanOptionsFromWorkerData(data, callbacks): 传给 AssetScanner.scanAll 的参数` — 子进程/worker 入口侧转发 (scan-helper.ts 与 worker.ts 共用)。
   透传字段集 (batchPauseMs / excludePaths / respectGitignore) 只在这两个函数出现一次, 漏传类缺陷从结构上消灭; 单测对字段集断言防再犯。
3. **IPC 载荷投影** (A5): `AgentAssetRuntime.getLeanSnapshot()` — `selectorCache` 键 `lean-snapshot` (随 snapshot.id 失效), 资产走既有 `stripRaw`。`assets:snapshot` handler 与 `assets:project-scope` 激活结果 (若含 snapshot) 改走 lean; `assets:get` 不变 (raw 查看器契约)。progress partial 两个 emit 点 (`applyPartial` / `applyFileChange`) 发送前 map `stripRaw` (内存 snapshot 保留 raw)。**无 IPC 通道增删, 四方对账不动**。
4. **事件契约不变**: `assets:changed` payload 仍为 WatchEvent (合并后发最后一个); `IpcEvents` 表、preload、mock 均不动。
5. **status 语义** (A6): `setProjectDir` 缓存命中时, 若 `cached.status.lastCompletedAt` 距今 < `PROJECT_CACHE_FRESH_MS` (5min 常量) → 维持现状 `ready/stale:false`; 否则 → `state:'stale', stale:true` (其余字段继承), 由 ensureReady SWR 背景刷新。冷启动 restore 的条目 lastCompletedAt 为上次运行时间 → 天然判 stale, 与 SWR 语义对齐。

## 模块结构 / 改动面 (遵守 ARCHITECTURE 分层: engine 零 electron import, electron 值 import 仅白名单)

| # | 修复 | 文件 | 要点 |
|---|---|---|---|
| S1 (A1) | respectGitignore 透传 + 映射单源 | `pkg:engine/assets/worker-host.ts` (新增两映射函数 + WorkerAssetScanner 改用)、`pkg:engine/assets/worker.ts`、`src/main/helper-host.ts` (HelperAssetScanner 改用)、`src/main/scan-helper.ts` | 纯函数在 engine, electron-free; 两入口各减一段手拼对象 |
| S2 (A3) | helper spawn 失败 reject + 不活动看门狗 | `src/main/helper-host.ts` | `ensure()` pre-spawn exit → reject spawnPromise (spawn 后移除该监听); `runScan` 整周期 (含 await ready) 由不活动计时器包裹, 超时 → `kill()` + reject 描述性错误; 任意 message 重置计时; 构造注入 `inactivityTimeoutMs` (默认 120s) |
| S3 (A3) | worker exit 无条件 settle + 对称看门狗 | `pkg:engine/assets/worker-host.ts` | `once('exit')` 去掉 `code === 0` 早退 (未 settle 一律 reject); `WorkerLike` 增可选 `terminate?()`; 同款不活动看门狗, 超时 terminate + reject |
| S4 (A2) | refresh 排队泛化 + 队列生命周期 | `pkg:engine/assets/runtime.ts` | in-flight 时**所有 reason** 进 `queuePendingRefresh` (латest-wins 单槽); 新增 deferred: wait:true 调用方 await 排队刷新完成 (Q4); `cancel()` 清队列+resolve deferred; `pause()` 同 (pause 已内联 cancel); `rebuild()` 代码不动 — cancel 清队 → refresh 入队 → killed scan finally flush → 新扫描, 死区闭合 |
| S5 (A4) | sqlite 行级增量写 | `pkg:engine/assets/snapshot-store.ts` (契约)、`sqlite-snapshot-store.ts` (实现)、`runtime.ts` (`applyFileChange` 持久化路径走新方法, `persistIfDefaultView` 保留给全量 commit) | DELETE WHERE source_key + INSERT (ord 续位) + envelope upsert, 单事务; 复用 stripRaw |
| S6 (A5) | lean 投影 + partial 剥 raw | `pkg:engine/assets/runtime.ts` (`getLeanSnapshot` + 两 partial emit 点 strip)、`src/main/ipc/handlers.ts` (`assets:snapshot` → lean; 排查其余返回 `getSnapshot()`/`getScanResult()` 的 handler 一并投影) | strip 只作用于出程载荷; 内存/assetMap/assets:get 保留 raw |
| S7 (A5) | assets:changed trailing 合并 | `pkg:engine/assets/trailing-coalescer.ts` (新, ~20 行)、`src/main/index.ts` (watcher listener 中广播段接入) | applyWatchEvent 逐事件不变; 仅 `webContents.send('assets:changed')` 过 250ms trailing 窗 |
| S8 (A6) | 缓存命中新鲜度 | `pkg:engine/assets/runtime.ts` (`setProjectDir` 缓存命中分支) | 5min TTL 判新鲜; stale 路径继承其余 status 字段; `project-scope-runtime.ts` 本体不动 (Q2) |

反模式检查: 不新增 GUI 设置 (Q3); 不暴露新 IPC; engine 内新文件零 electron import; handler 仍薄读。

## 界面质量与交互验收

本批无新 UI, renderer 代码零改动 (S7 在 main 侧)。数据流/时序类可观测验收 (不变量 22, verify 阶段 dev 实例真跑 + CDP):

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 扫描中重建 (P0-2) | 状态机排队闭环 | dev 实例: 扫描进行中点 "重建索引" → 进度条重启并最终 ready、资产数非 0 (CDP 观察 status 流) |
| 永久 scanning 免疫 (P0-3) | 看门狗 | 单测为主 (故障注入不宜实机); dev 实例仅回归正常扫描不被误杀 |
| 高频落盘抖动 (P1-5) | changed 合并 + lean 载荷 | dev 实例: 触发连续文件变更, CDP network/console 观察 assets:changed 到达频率有界; Overview 数据仍最终一致 |
| 项目切换 SWR (P1-6) | stale + 背景刷新 | dev 实例: 切到冷项目 → 立即显示缓存数据 + 状态徽标显示更新中 → 后台完成后数据刷新 |
| loading/error 态 | 看门狗触发后 status=error | 单测断言 status 转移; UI 既有 error 呈现复用 |

## 测试策略

每实现项先写/更新目标测试 (不变量 16)。全部可自动化, 无 manual-only 项; dev 实例 CDP 观察是 verify 阶段的补充证据而非替代。

| 变更/行为 | 测试类型 | 测试文件 | 命令 |
|---|---|---|---|
| S1 映射函数字段集往返 + HelperAssetScanner payload 含 respectGitignore/batchPauseMs/excludePaths | unit | `tests/unit/asset-worker-host.test.ts`、`tests/unit/helper-host.test.ts` | `pnpm vitest run tests/unit/asset-worker-host.test.ts tests/unit/helper-host.test.ts` |
| S2 pre-spawn exit → runScan reject; 不活动超时 → kill+reject; message 重置计时不误杀 | unit (fake timers + fake UtilityProcess) | `tests/unit/helper-host.test.ts` | 同上 |
| S3 exit(0) 无 done → reject; 超时 terminate+reject | unit (fake WorkerLike) | `tests/unit/asset-worker-host.test.ts` | 同上 |
| S4 扫描中 watcher/manual refresh 排队并 flush; rebuild-during-scan 终态 ready 且资产非空; cancel 后 refresh 可启动; cancel/pause 清队列且 deferred resolve; wait:true 等到新扫描 | unit (可注入 scanner 的时序测试) | `tests/unit/agent-asset-runtime.test.ts` | `pnpm vitest run tests/unit/agent-asset-runtime.test.ts` |
| S5 replaceBySourceKey 行级替换 (其余行不动/空数组删除/envelope 更新/strip raw); applyFileChange 走增量、无方法时降级 save; commitScan 仍全量 save | unit (fake SqliteDatabase) | `tests/unit/sqlite-snapshot-store.test.ts`、`tests/unit/agent-asset-runtime.test.ts` | `pnpm vitest run tests/unit/sqlite-snapshot-store.test.ts tests/unit/agent-asset-runtime.test.ts` |
| S6 getLeanSnapshot 无 raw + 同 snapshot.id 复用缓存; 两 partial emit 无 raw; assets:get 保留 raw | unit | `tests/unit/agent-asset-runtime.test.ts` | 同上 |
| S7 TrailingCoalescer: 窗口内多事件只发最后一个; 窗口外直发; 定时器清理 | unit | `tests/unit/trailing-coalescer.test.ts` (新) | `pnpm vitest run tests/unit/trailing-coalescer.test.ts` |
| S8 缓存命中: 新鲜 (<5min) → ready; 陈旧 → stale + ensureReady kick 背景刷新; 反复切换无叠加扫描 | unit | `tests/unit/agent-asset-runtime.test.ts`、`tests/unit/project-scope-runtime.test.ts` | `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/project-scope-runtime.test.ts` |
| 回归总闸 | 全量 | — | `pnpm typecheck && pnpm lint && pnpm test && pnpm harness:check` |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| S1 | A1 |
| S2, S3 | A3 |
| S4 | A2 |
| S5 | A4 |
| S6, S7 | A5 |
| S8 | A6 |
| 回归总闸 | A0 |

## 顺序/并行边界

S1→S3 互不重叠且不碰 runtime.ts, 可先行; S4→S6、S8 均改 `runtime.ts` (同文件反复修改), **必须顺序执行**; S7 独立 (engine 新文件 + index.ts)。执行序: S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8, 主 session 顺序推进 (状态机/持久层 risk=high, 不派并行 subagent), 每项过目标测试后按 COMMIT_POLICY 单独提交。
