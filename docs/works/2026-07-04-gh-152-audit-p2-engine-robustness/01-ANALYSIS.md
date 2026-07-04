# 需求分析 (Explore 产物) — GH-152 审查修复批次二 (P2)

> 基于 master bb41e498 → 0bc95fe5 实读源码; B1-B8 编号对应 00-BUG。

## 现状理解

### B1 NUL 字节
`session-replay.ts:113` 字面 `\x00` 已实测坐实 (file=data, `i/-text`)。改 `'\0'` 转义, 运行时字符串等价 (键值不变, AssetFileCache 指纹缓存无迁移)。

### B2 MiniSearch 判脏 — **explore 关键约束: 不能只键 snapshot.id**
- `search.ts:37-48` `ensureIndexed(assets)` 每查询: `buildSearchDocs` (全资产深走 meta, :101-125) + `createIndexSignature` (全字段拼接+sort, :138-157) 比对签名。
- **`applyFileChange`/`applyPartial` 在稳定 snapshot.id 下变更 assets** (GH-113/GH-135 设计: id 稳定防 id 键消费者重取) — 判脏若只键 snapshot.id, 增量变更后搜索用陈旧索引 (新 session 搜不到直到下次 commit)。
- 正确判脏键 = **资产数组引用相等** (`this.indexedAssets === assets`): runtime 所有变更点都immutable 地新建数组 (fold 不变量), 引用不变 ⟺ 内容不变; O(1)、零新计数器、无漏点。两个不同引用同内容 (如快速 A↔B 切换重 serve) 只多付一次重建, 频率远低于 per-keystroke。
- 消费面: `runtime.search` (`runtime.ts:566-579`, 唯一生产调用) 经 selectorCache (query+scope 键) 缓存结果; `buildIndex` 与 `addAsset/removeAsset` 生产零调用 (`search.test.ts` 消费 buildIndex)。签名机制 (`createIndexSignature`/`signatureField`/分隔符常量) 变孤儿 → 同批删除 (本次改动产生的孤儿); `addAsset/removeAsset` 是**既有**死代码, 只提不删 (行为守恒: 同步清 `indexedAssets`)。

### B3 安慰剂设置
`settings.ts:94/96/99` — `numControl('scan-concurrency'…)`、`numControl('min-free-disk-mb'…)`、`boolControl('content-hash'…)` 均默认 `supported:true, editable:true`; `boolControl` 已有第 5 参 supported (osThrottle win32 先例, :97), `numControl` 需加可选 supported 参。preset 表 (:53-55) 仍写 scanConcurrency 值 — 保留 (存储兼容, 无消费)。渲染面板对 `supported:false` 的呈现沿 osThrottle 先例 (设置区禁用态), renderer 零代码改动。

### B4 吞错集群 — 逐点归类 (豁免=存在性/目录缺失容错; 记账=解析损坏)

| 文件 | 豁免 (维持静默) | 记账 (补 log) |
|---|---|---|
| `united-memory.ts` | :96 access 探测 | :118 yaml frontmatter; :146 JSON.parse entries; :235 index.json 读+parse (且结果被缓存 → "未安装"误报); :287 readNote (ENOENT 分支静默, 其余 log) |
| `claude-native.ts` | :53 access; :183 readdir root; :191 stat dir; :206 readdir files | :67 yaml frontmatter; :216 readMemoryIndex (ENOENT 静默/其余 log); :246 buildNotes; :291 与 :308 per-note read (ENOENT 静默/其余 log) |
| `agent-teams/index.ts` | :29 readdir teamsRoot; :126 readdir taskDir; :172 readdir inbox; :203 statSync mtime | :65 config.json JSON.parse (团队消失零痕迹); :137 task JSON.parse; :184 inbox JSON.parse |

- 日志经既有 seam `getMainLog().log(scope, err)` (pkg:log, 仅落 userData/logs); 防刷屏按 `scope:path` 进程内去重 (损坏文件在每次 IPC list 都会重读) — 抽 `src/main/domain-log.ts` 小助手 (`logParseFailureOnce(scope, path, err)` + ENOENT 判定), memory 与 agent-teams 两域共用。
- 测试注入点: `log.ts` 的 `setMainLogWriter` 可注入捕获 writer (进程级 seam, 测试后恢复)。

### B5 退出路径
- `src/main/index.ts:265-267` before-quit 只 kill helper。快照 store 实例内联在 `initAssetRuntime({ snapshotStore: createSqliteSnapshotStore(...) })` (:220), 无外部引用 → 需提为 const。
- 伪 failed 历史: quit kill → runScan reject → coordinator `cancelled=false` → `failScan` → `recordScanHistory(ok:false)` 在退出路径写库。**修复 = before-quit 先 `getAssetRuntime().cancel()`** (置 coordinator.cancelled → reject 走静默丢弃分支; GH-151 S4 的 cancel 还会清队防重启), 再 kill, 最后 store close。
- `SnapshotStore` 契约加可选 `close?()`; sqlite 实现 `wal_checkpoint(TRUNCATE)` + `db.close()` + 置 closed 防复用 (与 B6 的 untried 语义区分)。

### B6 getDb 瞬态锁
`sqlite-snapshot-store.ts:70-74` 任何 open 失败 → `db = null` 永久放弃。better-sqlite3/fs 错误码分类: `SQLITE_BUSY`/`SQLITE_LOCKED`/`SQLITE_CANTOPEN`/`EBUSY`/`EPERM`/`EACCES` → 瞬态 (保留 undefined 允许重试); 其余 (损坏/schema 异常) → null 放弃。防每 250ms 增量写反复 hammer: 瞬态失败记 `nextRetryAtMs` (默认 5s 退避, 构造可注入 now)。

### B7 弹框节流
`index.ts:27-30`。抽纯函数 helper (如 `createErrorDialogGate(windowMs, now?)`: 按 message 时间窗去重) 到 src/main 直测; 日志仍逐条落。

### B8 电池 seed
`index.ts:205` `let onBatteryPower = false` → `powerMonitor.isOnBatteryPower()` (electron.d.ts:10033 确认存在)。装配层单行。

## 关联与依赖 (符号边界)

| 改动面 | 消费者 |
|---|---|
| `engine/search.ts` | `runtime.search` (唯一生产调用点) + `tests/unit/search.test.ts` |
| `engine/assets/settings.ts` controls | `runtime.getEngineInfo` → 渲染设置面板 (supported:false 已有呈现语义) |
| `src/main/memory/*` + `agent-teams/*` + 新 `domain-log.ts` | `memory:*`/`teams:list` IPC; 测试 `memory-*.test.ts`/`agent-teams-reader.test.ts` |
| `engine/assets/snapshot-store.ts` (+close 契约) + `sqlite-snapshot-store.ts` | runtime、`src/main/index.ts` 装配、`sqlite-snapshot-store.test.ts` |
| `src/main/index.ts` (before-quit/uncaught/电池) | 装配层, 无单测 (e2e 关停路径间接覆盖) |
| `engine/session-replay.ts` (B1) | 行为不变; `session-replay-engine.test.ts` 回归 |

无 IPC 通道增删, 无 renderer 代码改动, 无跨进程契约变更 — scope=module 成立。

## 任务分类与 debt 校准

- type: bug / source: user-request (refs GH-151) — 维持
- debt estimate 修正: 维持 (incurred 3 / repaid 4 / net -1, module/medium); B2 的判脏键从 snapshot.id 改为引用相等属方案精化, 不改影响面
- revision: 不追加 (无量级变化); confidence 维持 medium, design 锁定后升 high

## 验收标准

1. **A-B1**: `session-replay.ts` 无字面控制字节, `git ls-files --eol` 显示文本; 既有 session-replay 三个测试文件全绿 (键构造行为不变)。
2. **A-B2**: 同一资产数组引用重复 search 不重建索引 (addAll 仅一次); 新数组 (增量变更后) 重建且新资产可搜; 签名机制删除后 search.test.ts 全绿。
3. **A-B3**: `scan-concurrency`/`min-free-disk-mb`/`content-hash` 三控件 `supported:false` (单测断言); 其余控件 supported 不变。
4. **A-B4**: 损坏 fixture (坏 config.json / 坏 index.json / 坏 frontmatter) → 返回值维持容错语义 (不 throw、跳过/降级) 且捕获 writer 收到对应 scope 的 log; 同一路径重复列举只 log 一次; ENOENT 场景零 log。既有 memory/agent-teams 测试全绿。
5. **A-B5**: store.close() 触发 checkpoint(TRUNCATE)+close (fake db 断言); close 后再调 load/save 不 throw (no-op); before-quit 顺序 = cancel → kill → close (装配层, 代码评审 + e2e 关停回归)。
6. **A-B6**: open 抛 SQLITE_BUSY → 本次 no-op 但退避窗口后重试成功 (注入时钟); 抛非瞬态错误 → 永久放弃 (不再重试)。
7. **A-B7**: 同 message 时间窗内只放行一次弹框 (纯函数单测); 不同 message 不互相抑制。
8. **A-B8**: 装配层单行 seed — tests: not needed (electron 装配, 无逻辑分支); 替代验证 = typecheck + 代码评审。
9. **A0**: typecheck/lint/test/harness:check 全绿; CI 三平台 success。

## 界面质量与交互验收

本批渲染层零代码改动。唯一 UI 可观测变化: 设置面板三个控件转禁用态 (supported:false 呈现沿 osThrottle 既有语义)。verify 阶段 dev 实例截图确认三控件呈禁用且无布局破坏; 不涉及新交互态。

## 未决问题

无 PRD 级歧义。design 裁决点仅两处 (不 block): ① B6 退避窗口默认值 (倾向 5s, 构造注入); ② B4 helper 放 `src/main/domain-log.ts` (两域共用) vs 各域内联 (倾向前者, 两处消费即达 shared 准入)。

## 旁支发现 (交叉引用)

watcher 路径集启动 existsSync 定死 → 后建目录监听盲区 (`watcher.ts:128-138`): 设计面大 (父目录监听或周期重评估), 按不变量 10 沉淀 `docs/issues/2026-07-04-IMPROVEMENT-watcher-paths-fixed-at-start-blind-spot.md` (本 explore 轮建档), 本批不修。
