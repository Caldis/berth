# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: 2026-07-04 会话内综合架构审查 (5 维度并行子审查 + 主 Agent 逐条源码复核), 用户指示"走 harness 流程进行逐个修复"。GitHub Issue: https://github.com/Caldis/berth/issues/151

## 范围

P0 三项 (功能失效/卡死) + P1 三项 (性能债/数据新鲜度), 全部经主 Agent 亲自读源码实锤, file:line 为 2026-07-04 master (65974506) 口径。

## P0-1 respectGitignore 生产链路双重漏传, 功能从未生效

- `src/main/helper-host.ts:152-160` — `HelperAssetScanner.scanAll` 组装 helper payload 时只传 `projectDir/sessionCache/projectScanCache/batchPauseMs/excludePaths`, 漏 `respectGitignore`
- `src/main/scan-helper.ts:34-39` — utilityProcess 子进程 `runScan` 转发 `scanner.scanAll` 时同样只传 `onProgress/onPartial/batchPauseMs/excludePaths`, 再漏一次
- 上游正确: `packages/berth-scan-engine/src/engine/assets/runtime.ts:406` 把 `settings.respectGitignore` (默认 true, GUI 可编辑) 传给 coordinator; CLI/worker 链路 (`worker-host.ts:133`) 有透传
- adapters 消费点存在: `adapters/claude-code/index.ts:136`
- **后果**: 打包应用里 GH-142 的 .gitignore/.berthignore 感知枚举完全无效; 被 ignore 的子树照样进索引 (数据污染 + 扫描耗时膨胀); 设置面板开关无任何效果

### 复现步骤 (P0-1)
1. 打包应用 (Electron helper 链路), 活动项目含 .gitignore 忽略的大目录 (如 node_modules 内 CLAUDE.md 类可扫资产)
2. 设置面板确认 respectGitignore 开启, 触发全量扫描
3. 被 ignore 路径的资产出现在索引中

### 期望 vs 实际 (P0-1)
- 期望: ignore 子树不进索引; 关闭开关后才进
- 实际: 无论开关, ignore 子树都进索引

## P0-2 refresh() 扫描中丢弃策略 → rebuild 竞态 + watcher 变更丢失

- `packages/berth-scan-engine/src/engine/assets/runtime.ts:378-384` — `refresh()` 在 `coordinator.isScanning()` 时, 仅 `reason==='project-scope' && !wait` 进 `queuePendingRefresh`, 其余 reason (manual/watcher/periodic) 静默丢弃直接返回
- 竞态 A (rebuild): `runtime.ts:442-453` `rebuild()` 先 `cancel()` (helper `child.kill()` 的 exit 事件**异步**才清 `coordinator.inFlight`, 见 `scan-coordinator.ts:87` + `src/main/helper-host.ts:59-64`), 随后**同步**调 `refresh({reason:'manual'})` → 必然命中 isScanning 早退。此时持久索引 (`snapshotStore.clear()`)、内存快照、缓存已全部清空 → 应用停在 initial 空快照、状态 idle、无扫描在跑。窗口是同步代码, 100% 落入死区
- 竞态 B (watcher 丢失): 全量扫描持续 30s-1min, 期间 session/settings/skills 等不支持增量的变更走 `scheduleRefresh('watcher')` → debounce 到期落进扫描窗口即被丢; 若扫描已枚举过该目录, 本轮结果也不含该变更 → 最长 24h (周期扫描, 还受电源门控推迟) 不可见
- cancel 后 refresh 同理全丢 (worker 链路 `WorkerAssetScanner` 无 cancel 实现, `isScanning` 持续 true 到扫完, 加重 B)

### 期望 vs 实际 (P0-2)
- 期望: rebuild 后必然发生一次全量重扫; 扫描窗口内的变更最迟在本轮扫描结束后被补扫
- 实际: rebuild 可停在空索引; 扫描窗口内 watcher/manual refresh 静默蒸发

## P0-3 跨进程扫描 job 无超时看门狗 + spawn 失败永挂

- `src/main/helper-host.ts:87-129` — `runScan` 的 promise 只在 done/error/exit 三事件 settle; helper 进程活着但阻塞 (挂死的网络盘符号链接上的同步 fs、被杀软锁住的巨型 JSONL) → 永不 settle → `coordinator.inFlight` 永占 → 结合 P0-2 所有后续 refresh 被丢 → 应用永久显示 scanning, 唯一出口是手动 cancel
- `src/main/helper-host.ts:66-83` — `ensure()` 的 spawnPromise 只在 'spawn' 事件 resolve; utilityProcess 启动失败 (打包缺 scan-helper.js/资源耗尽) 触发不带 spawn 的 exit, 该处理只清 `this.child` **不 reject spawnPromise** → `runScan` 卡死在 `await ready` (runScan 的 exit 监听在 await ready 之后才注册) → 连 cancel 都救不回
- `packages/berth-scan-engine/src/engine/assets/worker-host.ts:98-101` — worker_threads 链路 `exit(0)` 且无 done 消息 (postMessage 结构化克隆失败等) 同样永挂 (`if (settled || code === 0) return`)
- progress 消息现成可当心跳, watchdog 实现成本低

### 期望 vs 实际 (P0-3)
- 期望: 扫描 job 异常 (进程挂起/spawn 失败/无 done 退出) 在有限时间内 fail → 状态回 stale/error, 后续 refresh 可用
- 实际: 三种故障注入都导致 promise 永不 settle, 索引管线永久钉死

## P1-4 SQLite 快照全删全插位于增量热路径 (同步阻塞主进程)

- `packages/berth-scan-engine/src/engine/assets/sqlite-snapshot-store.ts:95-113` — `save()` = `DELETE FROM asset` + 全量逐行 INSERT + 每资产 `JSON.stringify` (事务内, 但全量重写)
- 触发链: `runtime.ts:905-919` `applyFileChange` (watcher 增量路径) → `persistIfDefaultView` (`runtime.ts:756-759`) → 每次活跃会话 transcript 落盘 (watcher awaitWriteFinish 250ms) 全库重写; session 占资产 70%+ (derive-asset.ts:113 注释)
- 量级: 数千资产 × ~0.5-2KB JSON ≈ 2-10MB stringify + 同步 better-sqlite3 写, 全部阻塞主进程事件循环
- `source_key` 列设计意图就是单文件替换 (`sqlite-snapshot-store.ts:183-189` 注释自述 "future single-file change can DELETE ... WHERE source_key = ?") 但从未被 save 路径使用

## P1-5 commit 边界不剥 raw + assets:changed 渲染侧无防抖 (IPC 负载放大)

- `runtime.ts:685-694` — `commitScan` 直接 `snapshot.assets = outcome.scanResult.assets`, **保留 raw**; 只有落盘 (`snapshot-store.ts:24` stripRaw) 和 partial 流 (`scanner.ts:146` stripAssetRaw) 剥
- `src/main/ipc/handlers.ts:162` — `assets:snapshot` 原样返回 `getSnapshot()` → 每次全量含 raw 正文 (数 MB) 结构化克隆过 IPC; 渲染层已有按需 raw 通道, 快照内 raw 是纯冗余
- 渲染侧 4 个 `assets:changed` 订阅方逐事件直发重 IPC 无合并: `use-ipc.ts:188` (全量 snapshot 重取)、`use-ipc.ts:659-664` (health 重查)、`use-dashboard-insights.ts:56-59` (365 天 insights 全量聚合)、`use-ipc.ts:345-347` (engineInfo); main 侧只有 assets:progress 过 coalescer, changed 逐事件直发
- 触发: 一次 agent 会话连续落盘 = 每文件事件四连发重 IPC

## P1-6 项目切换缓存命中强制 ready/stale:false, 陈旧数据无限期不刷新

- `runtime.ts:352-358` — `setProjectDir` 命中 `snapshotCache` 时无条件 `state:'ready', stale:false`
- 但缓存内容可能是: (i) 冷启动 `restorePersistedSnapshot` 的上次运行持久快照 (`runtime.ts:191` 入 cache); (ii) 该项目非活跃期间 watcher 只写活跃键 (`applyFileChange:916` 用 `this.projectDir` 做键), 其它项目缓存不更新
- `src/main/project-scope-runtime.ts:41-43` 仅 `!cached` 时才 refresh; `watcher.ts:117-124` 项目级目录只监听活跃项目
- **后果**: 切回旧项目 → 陈旧数据被当新鲜展示, SWR 不接手, 最长 24h 不更新 (与冷启动 SWR 语义不一致)

## 验收总纲 (来自审查报告)

- 每项修复配目标测试; 竞态项 (P0-2/P0-3) 用可注入时序的单测钉住
- P0-1 补一条 "helper 链路 options 字段对账" 测试防再犯 (两条 scanner 链路 options 字段对齐)
- P1-5 渲染侧防抖需保证 UI 数据一致性 (fold 不变量不破坏)
- 全局门禁: typecheck / lint / test / harness:check

## 关联 (同批审查发现, 不在本任务范围)

审查报告中的 P2/P3 项 (typed registerHandler/sender 校验、MiniSearch snapshot.id 判脏、NUL 字节、安慰剂设置、memory/agent-teams 吞错、DRY 收敛、巨石拆分等) 不入本批, 待后续沉淀为 docs/issues 或独立任务。
