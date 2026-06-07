berth 扫描器重构 **第二轮对抗 review**。你上一轮 (round-1) 的判断我**基本全部采纳** (尤其: 确定式 id 未就绪是 Pre-Tier-0 阻塞; 单文件多资产须按 source_path 原子替换; SQLite 单 writer 串行+事务边界; 全局虚假完整需 per-root 状态; delta/SAB/FTS5/worker 池后置; 复杂度在一致性不在吞吐)。下为据此**收窄后的设计**, 请第二轮对抗。

## 约束: 禁联网 (已 --disable web_search); grep/跳读不全读; 简洁中文。

## 我已用联网核实 (你不必查, 据此 review)
- chokidar `awaitWriteFinish{stabilityThreshold,pollInterval}` + `atomic` 选项确实存在 (默认 stabilityThreshold=2000ms, 我会用 ~250ms; atomic 默认 true 滤原子写 unlink+add 伪事件)。Tier-0 debounce 成立。
- **better-sqlite3 在 Electron worker_threads 里跑原生模块有已知崩溃风险** (electron#43513)。故定案: **SQLite 单 writer 放 main 进程** (better-sqlite3 同步, 批量事务 + 批间 setImmediate 让出, berth 资产量百-低千, 单批 ms 级不卡 IPC); **worker 只 parse 产 changeset (纯 JS 对象) 回传 main**, main 串行写库; WAL 让读并发。这同时解掉你 A3 的"放 worker 多连接"与"放 main 卡 UI"两难。

## 收窄后的设计 (采纳 round-1)
**不变量**: I1 单管线 (full = 冷缓存全 miss); I2 scope=过滤非触发; I3 SQLite 真源 (MiniSearch/内存派生)。
**Pre-T0 身份契约**: 把所有 claude parser (`makeId(Date.now)`: mcp `:211`/hook `:316`/skill/command `:146`/permission `:522`/env `:557`/statusline `:614,675`/plan/todo...) 改**确定式 id** = `${type}-${scope}-${stableHash(dedupePathKey(sourcePath)+':'+entityKey)}`。entityKey 取: hook=`scenarioHash:hookHash` (已在 meta, scanner.ts:284 稳定); mcp=server name; permission=kind(allow/deny); env='env'; statusline=settingKey; skill/agent/command=name 或相对路径。每条带 `meta.sourcePath`。测试: 同文件扫两次 id 全稳定; settings.json 整组资产可按 sourcePath 整体替换 (含增删改顺序)。
**T0 正确性快赢** (并行, 互不依赖): ①racy-hash 失效 (file-cache.ts:96 仅 path+size+mtime → mtime≥indexed_at 时回退读内容 hash; session 大 JSONL 不全 hash); ②watcher debounce/coalescing (watcher.ts:42 当前每事件立即发: awaitWriteFinish+atomic+~200ms 同目录合并, **unlink 不被 debounce 吞**); ③MiniSearch changeset (现 removeAll/addAll → 用已存在的 addAsset/removeAsset 增量)。
**T1 持久化**: SQLite (main, WAL) schema `file_fingerprint(path PK/size/mtime/content_hash/indexed_at/parser_version)` + `asset(id PK/source_path/.../payload_json)` + `asset_raw` + `catalog_meta`。冷启读库→SWR partial 秒出。parser_version purge-on-change。`AssetFileCache.toSnapshot/fromSnapshot` 后端换 SQLite, API 不变, **不改 UI/不引 delta**。
**T2 单管线+单 writer**: adapter 拆 `deriveAssetsForPath(path)→Asset[]`; `runScanAll`=枚举所有 path 逐个 derive (全扫=全 miss); **canonical merge (AGENTS.md 跨 adapter) 作为写库前显式步骤** (只持久化 merged canonical 行, 不存 raw adapter 行); 单 writer 每 path/batch 一事务 = `fingerprint upsert + DELETE asset WHERE source_path=? + insert 新派生 + checkpoint bump`, partial 在 commit 后发; parse error 不静默删旧资产 (保留旧行 + 标 error)。
**T3 全局后台+纯过滤+完成度**: 后台全量扫全设备 (删/降级 `appendShallowConventions` scanner.ts:261); 删 `setProjectDir` 重扫 (project-scope-runtime.ts:34-45 → 纯 setScopeSelection 过滤); per-root/per-type 完成度状态 (indexed|scanning|error|unknown), 全局空态须等相关 root ≥1 次校验完成才出 (不误导"没有"); 设备级统一 watcher (运行时增删根, 不 per-project 重启)。
**T4 后置 (实测规模驱动)**: delta partial / session byte-offset tail / FTS5 / SAB 取消 / AIMD / 长驻 worker 池 / 丰富 knob。暂停/恢复 + 基础设置档位落 T3 尾或 T4。

## 你第二轮要做 (对抗式, file:line + 理由)
A. 对收窄设计仍有的正确性/架构缺陷 (尤其: Pre-T0 的 entityKey 方案是否对每种多实体类型**碰撞安全且跨扫稳定** — 有无类型的天然键不稳 (如 hook handler index、同名 mcp、settings.json 里同事件多 hook)? canonical-merge-在-写库前 的边界是否干净 (merged 行的 source_path 是哪个 adapter 的物理路径? 两 adapter 路径不同但同物理文件时 dedupeKey 已归一, 但 source_path 反向删除按谁?)? main 单 writer 批量事务在最坏冷启 (百项目数千资产) 是否仍卡 UI?)。
B. **持久化垫脚石**: T1 直接上 SQLite vs 先把现有 `AssetFileCache` 快照持久化成 JSON 文件 (userData) 做"冷启秒出"再迭代到 SQLite — 哪个更省且不返工? berth 资产量下 SQLite 是否仍是对的第一步?
C. Pre-T0/T0/T1 三者**能否并行**或必须严格串行? 最小可独立落地、且对用户**最快可见价值**的第一个 PR 是哪个 (我倾向 Pre-T0 身份契约, 因它是后续一切的地基且能顺带修 makeid 选中丢失 bug)?
D. 收窄后仍被高估的复杂度 / 可再砍的部分; 以及每个 Tier 最易踩的坑 (编号)。
格式: A/B/C/D 四段; A/D 编号; 简洁。
