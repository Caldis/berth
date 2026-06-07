I now have enough grounding in the actual code. Let me produce the design input digest.

# 设计输入 Digest — 全局后台渐进增量可控扫描器 (berth, round-1)

> 本文是供 Codex 两轮对抗 review 的 round-1 输入。所有断言都映射到 berth 现有代码 (已核对 `file-cache.ts` / `watcher.ts` / `scanner.ts` / `scope.ts`)。引用的外部技术给出"为什么对 berth 成立"的理由,非泛泛照搬。

---

## 0. 一句话目标与三条不变量

**目标**: 应用启动即在后台扫描设备上**全部可扫资产** (所有项目 + 用户级 + 企业级 × skill/hook/mcp/agent/command/statusline/session/约定...),持久化成单一全局索引;切 用户域/项目域 = 对已扫结果做 narrow-down **过滤**,**永不触发扫描**;扫描后台、渐进、实时、持续、增量、可暂停、带缓存失效、可按设备性能调节。

**三条贯穿全文的不变量**:
- **I1 — 单一管线 (Spotlight)**: 不存在独立的"全扫代码路径"。全扫 = 冷缓存下"每个指纹都 miss"的退化情形;chokidar 一个事件 = 同一个 `deriveAssetsForPath(path)` 跑一条路径。berth 当前有两条概念路径 (`runScanAll` 全扫 + watcher 粗事件触发全量 refresh),必须坍缩成一条。
- **I2 — scope 是过滤谓词,不是扫描触发器**: berth 已有 `assetMatchesAppScope()` (scope.ts:83) 纯谓词。全局索引建立后,切 scope 只换谓词参数,零 I/O。`setProjectDir` 触发重扫的语义必须删除。
- **I3 — 真源在 SQLite,内存/MiniSearch 是派生缓存**: better-sqlite3 (v11.7.0 已在 deps 且在 `onlyBuiltDependencies`,但 `src/main` 零 import) 是持久真源;MiniSearch 索引、runtime 内存快照都从 SQLite 可重建。

---

## 1. 目标架构: 全局完整结果 + 纯 narrow-down + 持久化数据模型

### 1.1 资产真源表 (better-sqlite3, WAL)

库放 `app.getPath('userData')/berth-index.db`,`PRAGMA journal_mode=WAL; synchronous=NORMAL`。WAL 让后台索引写入不阻塞前台查询读 (Windows Search W11 三库分离 + WAL 的直接迁移)。按 **file 行粒度** 存 (clangd per-file `.idx` 分片),单文件变更只 upsert 受影响行,不重写整库 — 对照当前 `toSnapshot()` 整体序列化。

```
file_fingerprint                      -- 变更检测真源 (Git index 模型)
  path TEXT PRIMARY KEY
  size INTEGER, mtime_ms REAL, ctime_ms REAL   -- stat 快路径
  content_hash TEXT NULL               -- 仅 racy 嫌疑时回填
  indexed_at_ms REAL                   -- 判 racy 用的"本次索引写入时刻"
  parser_version INTEGER               -- 代码级失效 (IntelliJ getVersion)
  scan_depth TEXT                      -- 'deep' | 'shallow'
  durability TEXT                      -- 'enterprise'|'user'|'project'|'session' (salsa 分层)
  parsed_byte_offset INTEGER NULL      -- session JSONL tail 增量解析游标

asset                                  -- 派生资产 (1 file → N assets)
  id TEXT PRIMARY KEY                  -- 复用现有确定式 id
  source_path TEXT  -- FK→file_fingerprint.path (反向映射,见 §3.4)
  agent_id, type, scope, project_path, dedupe_key, scenario_hash, hook_hash
  payload_json TEXT                    -- 轻量字段; raw body 分离/lazy
  parser_version INTEGER

asset_raw (id TEXT PK, raw_json TEXT)  -- 重 body 单独表, 按需 lazy 读 (沿用 stripAssetRaw 思路)

catalog_meta (key TEXT PK, value)      -- schema_version / checkpoint_number / reset_signature
```

**为什么这是最高 ROI**: 多份调研一致指向"持久化是地基"。当前每次启动从零冷扫 (`AssetFileCache` 纯内存,重启全丢)。落库后冷启动 = 读 DB 秒出 + 只 re-derive 变化文件,这是"启动扫全部"在第 2 次起变廉价的**前置条件**。Everything "开机读 MFT 建库、之后只读 USN" 的桌面等价形态。

### 1.2 全局 = 完整结果, scope = narrow-down

全局索引覆盖**所有**项目的**全部**资产类型 (不再是当前"活动项目深扫 + 其它项目仅 AGENTS.md/CLAUDE.md 浅约定"的拼接)。`global` mode 返回全表;`user`/`project` mode 用 `assetMatchesAppScope()` 过滤。**关键风险 (调研多次点名)**: 当前 `filterAssetsByAppScope(assets, global)` 无条件返回全表,但若后台未扫完/某项目报错,用户看"全局"实际不全 — 违背"在[全局]看不到=等于没有"。**对策**: global 视图必须配合 §5 的非阻塞进度 (skeleton 表达"还在扫"而非空态误导"没有"),并在 `catalog_meta` 记录 per-durability 层的扫描完成度。

---

## 2. 扫描生命周期: 启动后台全量 → 增量 → 空闲校验 (渐进可用)

四阶段,全部走 I1 单管线:

1. **冷启动秒出 (warm-start)**: 读 SQLite → 立即 emit 上次快照 (复用现有 `onPartial`/`applyPartial` 渐进通道) → UI 渲染缓存结果。SWR 模式: 先上陈旧数据,后台静默 revalidate。
2. **两阶段全量校验 (IntelliJ scanning/updating)**: 阶段 A 廉价枚举 — 只对所有候选 path 做 `stat` 指纹比对 (不读内容),算出 miss/新增/删除集;UI 立即渲染"已发现 N 项 (灰态/局部 loading)"。阶段 B 仅对 miss 行 parse 并点亮。`AssetFileCache.read` 已天然区分 hit/miss/deleted/error (file-cache.ts:42-62),正好做阶段 A 来源。
3. **稳态增量 (notification-only 源模型)**: 全量起底后**永不再全扫**,只靠 chokidar 维护。一个文件事件 → coalesce → `deriveAssetsForPath` 跑该路径 → upsert SQLite + 增量更新 MiniSearch。这是 Windows Search "全扫初态、通知稳态" 范式 (USN 之于 NTFS = chokidar 之于 berth)。
4. **空闲安全网兜底 (USN rollover / FSEvents dropped)**: chokidar 语义弱于 USN 有序 journal (网络盘/容器/editor 原子写丢事件),空闲时对受影响 scope 做低频 reconcile 全扫,**绝不退化成整库 recrawl** (Watchman "避免 recrawl" 训诫)。

**渐进可用优先级**: 阶段 B parse 顺序按 §4 优先级带 — 用户当前 scope 先点亮,其余项目长尾后台慢补 (clangd dynamic/static 分层: 活动内容内存层优先覆盖磁盘层)。

---

## 3. 变更检测 + 缓存/失效策略

### 3.1 失效键: stat 快路径 + racy 回退 hash (Git index 模型) — **最强单点**

当前 `sameFingerprint` 只比 `path+size+mtimeMs` (file-cache.ts:96),有两个**真实缺陷**:
- **racy 漏更新**: 同一秒内原地等长改写 (编辑器保存 settings.json / 脚本重写 config.toml) 检测不到。
- **mtime 跨机不稳**: 持久化后换机/恢复备份会全体误判 stale → 无谓全扫。

**对策 (Git `ce_match_stat_basic`)**: 绝大多数文件走纯 stat 快路径 (零额外 IO);**仅当** 文件 mtime ≥ `indexed_at_ms` (racily clean) 才回退读内容算 hash 比对。berth 资产普遍 KB 级 (settings.json/skill md),hash 成本可忽略;唯独 session JSONL 大文件走 §3.5 byte-offset 增量,不参与全文件 hash。**理由**: 不给每个文件都算 hash 的前提下堵住漏更新 + 持久化跨环境稳健。这是落库前**必须先修的正确性前提**。

### 3.2 代码级失效: parser_version + purge-on-version-change (IntelliJ getVersion)

每个 parser/asset-type 一个 `PARSER_SCHEMA_VERSION` 常量,折进失效检查。parser 行为一变就 +1,命中旧版本行直接当 miss 重 parse — 零迁移代码。可做 per-category 版本 (skill/session/hook 各自,salsa per-input 失效),改 session 解析不波及 skill 缓存。**纪律兜底**: 加测试,parser 文件变更但 version 未 bump 则失败 (Spotlight "importer datestamp 变" 的显式化)。这会自动修掉 docs/issues 里的 legacy-scanner-stale 类隐 bug,无需手动 nuke 缓存。

### 3.3 checkpoint + signature 恢复 (Windows Search OnCatalogStatusChange)

`catalog_meta` 存 `reset_signature` (= schema hash + 适配器版本) 与 `checkpoint_number`。每批增量在**一个 SQLite 事务**内写更新并 bump checkpoint (事务提交点 = 天然 checkpoint 边界)。重启后: signature 变 → 按资产类型重建;未变 → 只 reconcile 未确认增量。把重启恢复成本从 O(全部资产) 降到 O(未确认增量)。

### 3.4 路径→资产反向映射 (修复 watcher.ts 当前缺陷)

当前 `buildWatchEvent` 的 `assetId = path.basename(filePath)` (watcher.ts:68) — 仅文件名,无路径上下文,无法精确定位资产,且 AGENTS.md/CLAUDE.md 多层级同名会碰撞。多实体文件 (settings.json → N hooks/mcp) 必须有稳定的 `source_path → assetId[]` 反向映射 (SQLite `asset.source_path` 索引),一个文件变更**替换**恰好其先前资产,不 append 重复。这是把 watcher 事件接通"精准失效"的核心,也复用现有 `dedupeKey` (scanner.ts:339) 合并多 agent 共享文件。

### 3.5 session JSONL byte-offset tail 增量

session 是仅追加的大 JSONL。当前一变就整文件重读重 parse (最大重复成本)。在 `file_fingerprint.parsed_byte_offset` 存已解析偏移,size 只增时只读 `[offset, EOF)` 新行累加 token/cost/消息数。边界: size 变小或 mtime 倒退 (截断/重写) → 放弃 offset 全量重读;半行缓冲;累计统计幂等。这是增量化收益最高的单点。

---

## 4. 调度 / 背压 / 限流 + 暂停/恢复

### 4.1 长驻 coordinator + 固定 worker 池 (取代每扫新建 Worker)

当前 `AssetWorkerHost` 每次 new Worker + 双向 clone sessionCache (序列化随规模放大)。改造 (对齐已存档 IMPROVEMENT-scan-worker-long-lived): 一个长驻 coordinator (main) + 小固定 worker 池 (池大小 = 设备性能档位 = 背压旋钮)。coordinator 持有**有界去重队列**,watcher 事件与启动枚举都 enqueue;worker pull→derive→回 delta (非整快照,消除 `stripAssetRaw` 仍存在的 structured-clone 成本)。per-item try/catch + 超时 = Spotlight importer 隔离 (一个畸形 session 文件 fail 该 item 不杀全循环,`error` 状态已存在于 file-cache.ts:60)。

### 4.2 三条优先级队列 (Mercator/IR-book 双队列 frontier + Windows gatherer)

- **高优先**: 用户当前域/项目资产 (切 scope 只**重排队列头部**,不重扫 — 落实 I2)。
- **普通**: chokidar 增量。
- **低优先**: 启动全量起底 crawl + 空闲重访。

队列项 = `(path, reason, priority)`。去重用 `Map<path, task>` (last-write-wins,parse 幂等保证安全)。最小时间堆同时承担**重访调度** (变更率 × 重要性 → 下次重扫间隔,Cho-Garcia-Molina;当前域短间隔、后台域长间隔 = "拉长间隔省性能"杠杆)。

### 4.3 coalescing/debounce (FSEvents latency + Watchman settle) — 当前完全缺失

watcher.ts 当前每个 add/change/unlink **立即** `notifyChange` (无任何 debounce)。一次 git checkout / npm install / 连续 session 写会喷成千上万事件冲垮管线。在 chokidar 与队列间插一层: chokidar `awaitWriteFinish` (stabilityThreshold ~250ms, 挡半写 session JSONL 解析失败) + `atomic:true` (挡 VS Code 原子写产生的伪 unlink+add 误删) + ~200ms debounce 窗口 + **同 owning-directory 合并** (skill dir / sessions dir 折叠成一次 re-derive)。session 路径给单独更长间隔 (持续 append 不主导队列)。

### 4.4 token bucket 限流 + 协作式取消/暂停

- **token bucket** 控每秒 fs open/stat/read 数 (~20 行,惰性按时间差补令牌)。启动桶满 → 当前域突发快出;之后回落低速后台扫不抢用户磁盘。档位 = 令牌速率 + 桶容量两个数。
- **协作式取消 (AbortController + checkpoint)**: 关键警示 — worker_threads 里 abort 信号**不会**自动停 CPU 工作,必须在循环边界 (adapter 间 / 每 ~50 文件) 主动查 `signal.aborted`/SharedArrayBuffer 标志位再 break。当前 runtime 用 `isCurrent()` 软放弃过期结果,但 worker 仍把整轮扫完才丢弃 = 白烧 CPU。改成命中取消即停且保留已建缓存。**暂停** = epoch 置暂停态在 checkpoint 阻塞;**恢复** = 清位。切域不再丢弃整轮扫 (持续增量下切域只改优先级/过滤)。
- **时间分片让出**: worker 内用 `setImmediate` 在 parse 批次间让出 (Node 无 requestIdleCallback 等价物),周期回消息泵响应取消/暂停 + 节流 partial 回传。
- **(可选, 锦上添花) AIMD 自适应**: 用 `perf_hooks` 事件循环 lag 作拥塞信号,UI 卡→并发乘性减,空闲→加性增。静态档位都就位后再加。

---

## 5. 进度 / loading UX: 局部化、实时、不打扰

- **多 token 并发进度 (LSP workDoneProgress)**: 当前 `AssetScanProgress` 单一 status。扩成支持并发 token: "当前项目快扫" 与 "全设备后台扫" 各一条,UI 分别用"局部 loading (可见区) + 全局静默后台细条/角标 (可取消)"渲染,匹配"不打扰"。总数未知阶段 (session 流) 省略 percentage 走 spinner;已知文件集合阶段才给 0-100。复用现有 `sidebar-scan-status.tsx` + `onPartial`/`onProgress`。
- **per-分类局部 skeleton (非全局 spinner)**: 每个资产分类独立骨架/局部 loading,某类还在扫不挡其他类已出结果 (渐进可见)。用户"明确的 局部 loading"要求的直接落地。
- **SWR**: 切域立即上缓存快照、后台静默替换 (符合 I2)。展示陈旧数据要有弱"刷新中"提示 (berth 能改/禁用资产,避免基于旧数据误操作)。
- **delta partial (LSP partialResultToken)**: 当前 `onPartial` 每次发**全量累积** assets,数据随扫描线性膨胀、structured-clone 成本上升。改成只发本批新增/变更 delta,renderer (Zustand) 按 id upsert/remove (天然适合)。
- **VSCode batch+超时调度**: partial flush 条件 = 攒够 64-128 条 **或** 距上次 >150ms,进度 `throttle` (~100ms) 而非每文件一次 (防 postMessage 自身成瓶颈)。
- **控制面**: status (indexed/queued 计数) + pause/resume ("可暂停可控") + erase-and-rebuild (从损坏缓存恢复,gate 为恢复动作非常规按钮),即 berth 版 `mdutil`。

---

## 6. 用户可配置设置 (具体 knob 清单)

当前 berth **完全没有 app 级设置持久化** (仅 localStorage 存 theme/accent/language)。新增设置需落 SQLite 或 `.berth/indexing.json`。遵循 Simplicity-First,**默认值借 Watchman 模板**,不裸露常量,打成档位:

| Knob | 默认 | 说明 |
|---|---|---|
| 后台持续扫描 总开关 | on | 对标 clangd `--background-index=false` |
| 性能档位 | 均衡 | 省电/均衡/性能,联动并发数+token 速率+debounce 窗口+时间片预算 |
| worker 并发数 | `hardwareConcurrency` 自动 | 背压主旋钮 |
| debounce/settle 窗口 | ~200ms | 当前域可更短、后台域更长 |
| token bucket 速率/容量 | 档位联动 | fs ops/秒 |
| content-hash 失效开关 | on (仅 racy 回退) | 关则纯 stat (网络盘弱 mtime 场景的逃生阀) |
| 排除路径列表 | node_modules/.git | 显式持久化 exclusion list (Spotlight privacy list);**必须白名单 berth 自己的 .claude/.codex/.agents dot 根** (GH-111 R2 误伤覆辙) |
| session 实时监听 | 低频轮询 | session 走 §3.5 增量,不进实时 watcher |
| 电池时暂停后台全扫 | on | `powerMonitor` onBattery (Windows Search backoff) |
| 空闲才全速 | on | 窗口 blur / system idle 提速,活跃降速 (加滞回防抖动) |
| 暂停/恢复 / 重建索引 | 手动 | erase-and-rebuild gate 为恢复动作 |

排除语义注意: 排除路径必须**既不枚举又驱逐已缓存资产** (复用 `pruneTo`,file-cache.ts:64),否则旧资产 linger。

---

## 7. 从 per-project 快照模型的迁移路径 (复用已落地成果)

**可直接复用 (不动)**:
- **T1 dedup**: `mergeSharedConventions` + `dedupeKey` (scanner.ts:336) 已确定式、幂等 (partial 与 final 都能调),全局索引跨项目合并直接用。
- **T3a owner 谓词**: `assetMatchesAppScope` / `assetMatchesProjectPath` (scope.ts:83-91) — owner-tagged 资产已支持跨项目过滤,是 I2 narrow-down 的现成实现。
- **确定式 id**: 现有 stable `asset.id` 是 SQLite `asset.id` 主键与反向映射的天然键。
- **`projectScopeCandidatesFromAssets`**: session 派生项目发现已成熟,驱动全设备扫描计划生成。
- **`AssetFileCache` 指纹 + hit/miss/deleted/error 状态机**: 升级为 SQLite-backed,parse 层几乎不动。
- **`onPartial`/`applyPartial` 渐进通道**、**hook 等价源标注** (`annotateEquivalentHookSources`, scanner.ts:377)、**per-project snapshotCache** (升级为全局索引的 scope-filtered view)。

**迁移顺序 (非破坏式, 单管线渐进切换)**:
1. 失效键升级 (§3.1) — 落库前的正确性前提,可在现内存缓存上独立验证。
2. `AssetFileCache.toSnapshot/fromSnapshot` 后端从内存数组换 SQLite,API 不变 (已为持久化预留)。
3. 适配器从 `scanAll(project)` 拆出 `deriveAssetsForPath(path)`,`runScanAll` 重写成"枚举所有 path → 逐个走 deriveAssetsForPath" (全扫 = 全 miss,I1)。
4. 删除 `appendShallowConventions` 浅约定拼接 (scanner.ts:261) — 全索引覆盖后浅约定退化为冗余;**但暂保留为 fallback** 直到全索引性能验证通过 (GH-113 取舍)。
5. `setProjectDir` 触发重扫 → 改为纯过滤 (I2);watcher 单项目重启 → 改为设备级统一监听 + 运行时增删根 (修 §3 企业级资产需重启才可见的缺陷)。

---

## 8. 分层实施建议 (可独立验证的 tier) + 风险 + 留给 Codex 的开放问题

### 实施 tier (每 tier 独立可验证 + 小步提交)

- **Tier 0 (最高杠杆小改动, 互不依赖, 可并行先做)**:
  - T0a watcher coalescing/debounce (§4.3) + `awaitWriteFinish`/`atomic`。验证: git checkout fixture 触发 N 文件 → 一次批处理。
  - T0b MiniSearch 从全量 `removeAll/addAll` 改 changeset 驱动 `addAsset/removeAsset` (接口已存在未启用)。验证: 单资产变更只动一个 doc。
  - T0c 失效键 racy 回退 hash (§3.1)。验证: 同秒等长改写 fixture 被检出。
- **Tier 1 — 持久化层**: SQLite schema + `AssetFileCache` 落库 + `parser_version` 失效。验证: 冷启动读 DB 秒出;parser version bump 自动失效该类型;schema 迁移测试。
- **Tier 2 — 单管线 + 调度器**: `deriveAssetsForPath` 拆分 + 长驻 coordinator + 三优先队列 + token bucket + 协作取消/暂停。验证: 切域零 I/O (I2);暂停/恢复不丢队列;畸形 session 文件不杀循环。
- **Tier 3 — 全索引 + UX**: 删/降级浅约定走全量起底 + 多 token 进度 + delta partial + per-分类 skeleton。验证: 全局视图含其它项目能力类型;真实 `~/.claude`+`~/.codex` 规模标定 batch/超时/debounce 默认值。
- **Tier 4 (按需后置)**: session FTS5 external-content + salsa durability 分层 + AIMD 自适应。仅当 session 规模实测成瓶颈再做。

### 主要风险

- **R1 一致性**: per-project `isCurrent()` 守护只护单 worker;后台多 worker 并行扫多项目 + 中途切项目需版本化快照隔离。
- **R2 全局虚假完整**: global 无条件返全表,后台未扫完/报错时"全局"不全 (违背"看不到=没有")。靠 §5 skeleton + per-durability 完成度缓解。
- **R3 大规模冷启**: 百项目 × 全 .claude/.codex + session 派生项目首次起底可能数分钟。靠 §2 两阶段 (stat 先、parse 后) + 优先级带缓解。
- **R4 跨平台 watcher 不可靠**: 网络盘/容器/原子写丢事件。靠 §2 阶段 4 空闲 reconcile 兜底,绝不 recrawl。
- **R5 better-sqlite3 同步 API**: 大批量写须在 worker 或拆事务,勿卡主线程;Electron 按 arch 分发原生 .node (参考 docs/friction 构建踩坑)。

### 留给 Codex round-1 的开放问题

1. **浅约定去留**: 全索引覆盖所有项目能力后,`appendShallowConventions` 是删除还是保留为 low-durability fallback?全索引数十项目 × 全资产类型的性能上界是否需要保留浅层作为 graceful degradation?
2. **@parcel/watcher vs 加固 chokidar**: parcel 的 `getEventsSince` (离线增量,补"关闭期间变更丢失") 价值高,但引入第二个原生依赖 + Electron ABI 维护。berth 已编译 better-sqlite3,边际成本是否值得?还是用"持久化 last-scan cursor + 启动 stat 比对"在 chokidar 上近似 since 语义?
3. **检查点取消通道**: SharedArrayBuffer 标志位 (最低延迟) 在 electron-vite/Electron 下是否可用?否则退到 postMessage 轮询 (延迟一个 checkpoint) 是否可接受?
4. **delta partial vs 全量快照的 renderer 一致性**: 从全量累积改 delta append,崩溃/乱序恢复以 SQLite + getEventsSince 为准重建,这套是否引入过多状态机复杂度 vs 当前全量替换的简单性?berth 资产量 (百-低千) 下 delta 是否过早优化?
5. **durability 分层标注准确性**: 把企业级/用户级标高耐久跳过校验,标错 (实际常变目录标成高耐久) 会漏更新。berth 是否有足够稳定的 scope 信号自动标注,还是需用户/约定显式声明?
6. **session 索引是否进 FTS5**: 轻资产留 MiniSearch、重 session 走 SQLite FTS5 的双索引边界是否值得?还是统一 MiniSearch 直到实测瓶颈?

### 引用最强的三项技术 (及理由)

- **Git index stat 快路径 + racy 回退 hash**: berth 当前失效键有真实 racy 漏更新 + 跨机不稳两个缺陷,这是落库正确性前提,且零额外 IO 成本最低。
- **better-sqlite3 持久化 file 行粒度索引 (Everything 建库 / clangd 分片 / W11 三库)**: 依赖已就位 (零新增风险),一举解决持久化+分片+冷启动秒出,是"启动扫全部"廉价化的地基。
- **Spotlight 单一 full→incremental 管线 (I1)**: 直接消灭 berth "切项目重扫" 成本,把全扫与增量坍缩成一条 `deriveAssetsForPath`,是整个重构的脊梁,也是 I2 narrow-down 模型成立的前提。

**关键载荷代码引用** (供 Codex 定位):
- 失效键缺陷: `src/main/engine/assets/file-cache.ts:96` `sameFingerprint` 仅比 `path+size+mtimeMs`
- watcher 无 debounce + assetId 仅 basename: `src/main/engine/watcher.ts:42-44, 68`
- scope narrow-down 谓词 (复用): `src/shared/scope.ts:83-91`
- dedup 幂等 (复用): `src/main/engine/scanner.ts:336` `mergeSharedConventions`
- 浅约定拼接 (待删/降级): `src/main/engine/scanner.ts:261` `appendShallowConventions`