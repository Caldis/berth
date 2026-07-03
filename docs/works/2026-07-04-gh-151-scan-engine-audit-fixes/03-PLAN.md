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
- [x] S5 (A4): SnapshotStore `replaceBySourceKey` 契约 + sqlite 行级实现 + `applyFileChange` 持久化改增量 (降级 save) (commit 103d4175)
  - tests: `sqlite-snapshot-store.test.ts` 单键替换/空删除/envelope/raw 剥离 + `agent-asset-runtime.test.ts` 增量与降级 — 先红后绿 69/69
  - verify: 不适用; 目标测试绿
  - 备注: 传入行取 post-merge 资产 (mergeSharedConventions 只折叠同文件), 与内存替换语义精确一致; INSERT OR REPLACE 兜 id 冲突边缘
- [x] S6 (A5): `getLeanSnapshot` + `getScanResult` lean 化 + 两 partial emit 点剥 raw + `assets:snapshot` handler 改 lean (`assets:get` 不动) (commit 51fd8022)
  - tests: `agent-asset-runtime.test.ts` 4 条 (lean/getAsset 保 raw/两 emit 点) — 先红后绿; 全量 1331 绿
  - verify: 不适用; 全量 test 确认渲染层无回归
  - **偏差 (方案内)**: 不用 selectorCache 缓存 lean 投影 — applyPartial 在稳定 snapshot.id 下变更资产, id 键缓存会 mid-scan 陈旧; 改为每调用 map (stripRaw 对无 raw 资产恒等, 代价远小于其替代的结构化克隆)
- [x] S7 (A5): `trailing-coalescer.ts` (engine 新文件, leading+trailing 250ms) + `index.ts` assets:changed 广播接入 (applyWatchEvent 逐事件不变) (commit 1cb98eab)
  - tests: `trailing-coalescer.test.ts` 4 条 (leading 即时/突发折叠 latest-wins/风暴限频/dispose); incremental-watch e2e 实证真实 chokidar 路径
  - verify: dev 实例 CDP 事件频率观察归 4.0-verify
  - 备注: 采用 leading+trailing 而非纯 trailing — 单文件编辑即时送达, 突发仍有界 (≤1+N/250ms)
- [x] S8 (A6): setProjectDir 缓存命中新鲜度 TTL (5min) — 陈旧标 stale, ensureReady SWR 接手
  - tests: `agent-asset-runtime.test.ts` 2 条 (陈旧→stale+派生读 kick; 新鲜→ready 不刷) — 先红后绿; project-scope-runtime/project-snapshot-cache 回归绿
  - verify: 不适用; 目标测试绿
- [x] 收口: 全局门禁 + 推送 + CI 旁路
  - tests: typecheck/lint/test 全绿 (185 文件 1337 测试, 无 Unhandled Errors); 受影响 e2e x5 (project-scope/global-shallow-scope/scan-control/incremental-watch/snapshot-persistence) 本地全绿; `pnpm harness:prepush` 通过后推送 70499e48, CI 三平台 (windows/macos/ubuntu) conclusion=success (run 28675417522, 子代理旁路消费成功结果)
  - verify: 已完成, 见下节

## verify 证据 (4.0-verify, 2026-07-04)

真机时序验收 (隔离 codex home + `dev:agent start --id gh151-verify --debug-port 9333` + CDP window.api 只读驱动, 断言落 observable):

1. **S4 扫描中 rebuild 死区闭合**: refresh 未等待即 rebuild → 终态 `ready`, 资产 3/3 恢复, 新快照 id — 修复前该序列 100% 停在空 initial。
2. **S6 lean 快照**: `assets:snapshot` 返回的全部资产 `raw === undefined` (0/3 携带)。
3. **S7 合并 + S4 最终一致**: 600ms 内写 20 个 session 文件 → `onChanged` 仅 4 次 (裸发≈20); 时间线采样 `60ms:12 → 561ms:20` 后连续 4 采样稳定 — 增量折叠无丢失。
4. **S8 切换无卡死**: activate 项目 2ms 返回 (背景 scanning), 切回 7ms 即 `ready` (5min TTL 内新鲜, 零冗余重扫), 23 资产可见。陈旧路径 (TTL 外 → stale + SWR) 由单测钉住 (真机无法压缩时间)。

旁支发现 (不入本批, 已交叉引用): 首轮采集观察到 burst 计数 20→15 瞬时回落且快照 id 不变 — mid-scan partial 整体替换压掉后到增量 (预先存在, S4 后有最终一致兜底), 记 `docs/issues/2026-07-04-BUG-mid-scan-partial-clobbers-incremental-folds.md`。

机械项: `harness:check` 全绿; `harness:stats` debt=28 notice (<40 无需 override); Project 字段已 ensure 同步 (GH-150 与一个归档任务的字段漂移属他人任务, 不越界)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。(本轮无不通过项)
