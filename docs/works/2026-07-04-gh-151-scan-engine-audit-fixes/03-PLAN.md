# 任务清单 (Design 产物 / 活清单) — GH-151

从 02-SPEC 拆解。顺序执行 (S4-S6/S8 同文件 runtime.ts, 不并行); 每项过目标测试后单独提交。

- [x] S1 (A1): 扫描选项映射单源 + respectGitignore 透传 — `worker-host.ts` 增 `workerDataFromScanOptions`/`scanOptionsFromWorkerData`, `WorkerAssetScanner`/`HelperAssetScanner`/`worker.ts`/`scan-helper.ts` 四处改用 (commit 1bca4305)
  - tests: `asset-worker-host.test.ts` 映射字段集往返; `helper-host.test.ts` payload 含全部透传字段 — 先红 (钉住双漏传) 后绿, 14/14
  - verify: 不适用 (非 UI); 目标测试绿 + typecheck 绿
- [x] S2 (A3): helper-host pre-spawn exit reject + 不活动看门狗 (默认 120s, message 重置, 构造注入) (commit 5e7ebed3)
  - tests: `helper-host.test.ts` — pre-spawn exit → reject (旧实现 5s 超时实证永挂); 超时 kill+reject; 消息重置不误杀 — 10/10
  - verify: 不适用; 目标测试绿
- [x] S3 (A3): worker-host exit 未 settle 一律 reject (去 `code===0` 早退) + 对称看门狗 (`WorkerLike.terminate?`) (commit 3af09ec1)
  - tests: `asset-worker-host.test.ts` — exit(0) 无 done → reject (旧实现超时实证); 超时 terminate+reject — 11/11 (含 worker-artifact 回归)
  - verify: 不适用; 目标测试绿
- [x] S4 (A2): runtime refresh 排队泛化 — 所有 reason latest-wins 入队 + wait waiters (Q4) + cancel/pause 清队并 resolve
  - tests: `agent-asset-runtime.test.ts` 新增 5 条时序测试全绿 (50/50); e2e project-scope / scan-control / incremental-watch / snapshot-persistence 全绿
  - verify: 不适用 (单测钉时序); dev 实例验收项归 verify 阶段
  - **偏差 1 (方案内澄清)**: `ensureReady` 的 initial 阻塞路径 (首次建索引) 改为 join in-flight 扫描而非入队 — 否则 UI 派生读风暴在启动扫描后触发冗余第二次全量扫描 (被 incremental-watch.e2e 抓住, id 抖动)。SWR stale 路径本有 state 门控不受影响。已补钉单测。
  - **偏差 2 (旧语义测试更新)**: 两条钉 "join in-flight" 旧语义的既有测试 (`reuses an in-flight scan` / GH-111 R4 discard) 更新为钉新排队语义 — join 捷径正是 rebuild 死区的机制本身; R4 无 clobber 不变量保持并加强断言 (scannerB 结果)。
- [ ] S5 (A4): SnapshotStore `replaceBySourceKey` 契约 + sqlite 行级实现 + `applyFileChange` 持久化改增量 (降级 save)
  - tests: `sqlite-snapshot-store.test.ts` — 单键替换其余行原样 / 空数组删除 / envelope 更新 / raw 剥离; `agent-asset-runtime.test.ts` — applyFileChange 走增量、缺方法降级
  - verify: 不适用; 目标测试绿
- [ ] S6 (A5): `getLeanSnapshot` (selectorCache 复用) + 两 partial emit 点剥 raw + handlers snapshot 类返回改 lean (`assets:get` 不动)
  - tests: `agent-asset-runtime.test.ts` — lean 无 raw / 缓存复用 / partial 无 raw / getAsset 保留 raw
  - verify: 不适用; 目标测试绿 + 全量 test 确认渲染层无回归
- [ ] S7 (A5): `trailing-coalescer.ts` (engine 新文件) + `index.ts` assets:changed 广播接入 (250ms trailing, applyWatchEvent 逐事件不变)
  - tests: `trailing-coalescer.test.ts` (新) — 窗口合并 latest-wins / 窗口外直发 / dispose 清理
  - verify: 不适用 (index.ts 接入为装配层, 由 verify 阶段 dev 实例 CDP 观察事件频率)
- [ ] S8 (A6): setProjectDir 缓存命中新鲜度 TTL (5min) — 陈旧标 stale 继承字段, ensureReady SWR 接手
  - tests: `agent-asset-runtime.test.ts` — 陈旧缓存命中 → stale + 派生读 kick 背景刷新; 新鲜命中 → ready 不刷; `project-scope-runtime.test.ts` 回归
  - verify: 不适用; 目标测试绿
- [ ] 收口: 全局门禁 `pnpm typecheck && pnpm lint && pnpm test && pnpm harness:check` + 推送 + CI 旁路
  - tests: 全量
  - verify: dev 实例真跑数据流验收 (归 4.0-verify): 扫描中重建闭环 / changed 事件频率有界 / 项目切换 SWR 可见

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
