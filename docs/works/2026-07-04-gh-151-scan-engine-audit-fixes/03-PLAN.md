# 任务清单 (Design 产物 / 活清单) — GH-151

从 02-SPEC 拆解。顺序执行 (S4-S6/S8 同文件 runtime.ts, 不并行); 每项过目标测试后单独提交。

- [ ] S1 (A1): 扫描选项映射单源 + respectGitignore 透传 — `worker-host.ts` 增 `workerDataFromScanOptions`/`scanOptionsFromWorkerData`, `WorkerAssetScanner`/`HelperAssetScanner`/`worker.ts`/`scan-helper.ts` 四处改用
  - tests: `asset-worker-host.test.ts` 映射字段集往返; `helper-host.test.ts` payload 含全部透传字段 (fixture 值断言)
  - verify: 不适用 (非 UI); `pnpm vitest run tests/unit/asset-worker-host.test.ts tests/unit/helper-host.test.ts` 绿
- [ ] S2 (A3): helper-host pre-spawn exit reject + 不活动看门狗 (默认 120s, message 重置, 构造注入)
  - tests: `helper-host.test.ts` — pre-spawn exit → runScan reject; 超时 → kill+reject; 有消息流不误杀
  - verify: 不适用; 目标测试绿
- [ ] S3 (A3): worker-host exit 未 settle 一律 reject (去 `code===0` 早退) + 对称看门狗 (`WorkerLike.terminate?`)
  - tests: `asset-worker-host.test.ts` — exit(0) 无 done → reject; 超时 → terminate+reject
  - verify: 不适用; 目标测试绿
- [ ] S4 (A2): runtime refresh 排队泛化 — 所有 reason latest-wins 入队 + wait deferred (Q4) + cancel/pause 清队并 resolve
  - tests: `agent-asset-runtime.test.ts` — ①扫描中 watcher refresh 排队并在扫描结束后执行 ②rebuild-during-scan 终态 ready 且快照非 initial ③cancel 后 refresh 启动新扫描 ④cancel/pause 清队 deferred 不悬挂 ⑤wait:true 等到新扫描完成
  - verify: 不适用 (单测钉时序); dev 实例验收项归 verify 阶段
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
