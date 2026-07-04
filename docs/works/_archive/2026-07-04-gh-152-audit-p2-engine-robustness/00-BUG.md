# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: 2026-07-04 综合架构审查 P2 层发现 (P0/P1 批已在 GH-151 修复归档, 见 `docs/works/_archive/2026-07-04-gh-151-scan-engine-audit-fixes/`), 用户指示"继续"逐个修复。GitHub Issue: https://github.com/Caldis/berth/issues/152。file:line 为 master bb41e498 口径, 均经主 Agent 源码复核。

## B1 session-replay.ts 内嵌字面 NUL 字节

- `packages/berth-scan-engine/src/engine/session-replay.ts:113` — 缓存键分隔符是原始 `\x00` 字节 (`` `${path}<NUL>${lineIndex}` ``) 而非 `'\0'` 转义
- 实测: `file` 判 data、`git ls-files --eol` 显示 `i/-text w/-text`、diff 只显示 "Binary files differ"、ripgrep 静默跳过 — 审阅/检索/冲突解决工具链对该核心编排文件全部失明 (GH-151 审查期间的分层 grep 就漏过它)
- 期望: 源码为文本; 改 `'\0'` 转义后运行时键值不变, 缓存无迁移成本

## B2 MiniSearch 每新查询 O(全库文本) 签名重建判脏

- `packages/berth-scan-engine/src/engine/search.ts:37-48` (`ensureIndexed`)、`:138-157` (`createIndexSignature` 全字段拼接 + sort)、`:101-125` (`buildSearchDocs` 深走 meta)
- 每个未命中 selector 缓存的查询 (≈每个搜索 keystroke 的新 query) 都对全部资产做深度 meta 提取 + 数 MB 字符串签名 + N log N 排序, 判定要重建时再 removeAll/addAll 全量重建
- runtime 每次 commit 已 mint 唯一 `snapshot.id` — 签名机制是重复造轮; 归档设计文档曾两次指出 (docs/works/_archive/2026-06-07-gh-113.../review/research-synthesis.md:183)
- `:70-98` `addAsset/removeAsset` 全仓零调用 (死代码, 按 behavioral guidelines 只提不删, 本批记录不动)
- 期望: 判脏 O(1) (snapshot.id 比较); 快照未变时重复查询零重建

## B3 安慰剂设置 scanConcurrency / minFreeDiskMb / contentHash

- `packages/berth-scan-engine/src/engine/assets/settings.ts:94,96,99` — `editable:true, supported:true`; eco/balanced/performance preset 刻意区分 `scanConcurrency: 1/2/4` (:53-55); grep 全仓 (engine+src/main) 零读取点
- 用户调低并发/设磁盘余量以为在控资源, 实际无效 — 设置面板承诺与实现脱节
- 期望: 未实现控件标 `supported:false` (面板已有该语义, 见 osThrottle 的 win32 处理); 配置键保留 (向后兼容), 实现后再放开

## B4 memory / agent-teams 域解析失败类裸 catch 集群 (违反 ARCHITECTURE 规则 8)

- `src/main/memory/sources/united-memory.ts:96,118,146,235,287`; `src/main/memory/sources/claude-native.ts:53,67,183,206,216,246,291,308`; `src/main/agent-teams/index.ts:29,65,126,137,172,184,205`
- catch 后既不 log 也不进状态记账。ENOENT/存在性探测类属合理容错可豁免; 但 JSON.parse/结构损坏类不该静默: 如 united-memory.ts:235 — index.json 损坏 → `cachedIndexNotes=null` 且被缓存 → `detect()` 报 `available:false` → UI 呈现"未安装"而非"索引损坏", 日志零线索; agent-teams 同型 (损坏 config.json → 团队消失)
- 合规样板对照: `codex/parsers.ts:687` (malformedLineCount 记账)、`memory/index.ts:51` (错误折入 status)
- 期望: 解析失败类至少 `log(scope, err)` (可按路径去重防刷屏); ENOENT 类维持静默容错

## B5 退出路径: SQLite 不 close / WAL 不 checkpoint + quit 记伪 failed 扫描历史

- `src/main/index.ts:265-267` — before-quit 只 `getScanHelperHost().kill()`; `sqlite-snapshot-store.ts` 全文件无 close 调用点
- (i) db 永不 close → 退出时 WAL 不 checkpoint, `berth-index.db-wal` 常驻并随快照增大 (save 现为行级增量, 但 WAL 仍持续积累); 异常关机 + 磁盘满导致 -wal 无法回放时整库回退上个 checkpoint (冷启 SWR 数据静默丢失)
- (ii) quit 时 kill 正在扫描的 helper → runScan reject → coordinator `cancelled=false` → `failScan` → `recordScanHistory` 在退出路径写库, 扫描历史多一条虚假失败
- 期望: before-quit 先置关停标志 (in-flight 扫描按 cancelled 静默丢弃), 再 kill helper, 最后 checkpoint(TRUNCATE) + close (SnapshotStore 契约暴露可选 close)

## B6 getDb 首次 open 失败即永久放弃持久化

- `packages/berth-scan-engine/src/engine/assets/sqlite-snapshot-store.ts:70-74` — `db = null // give up permanently`
- 故障注入: Windows 启动瞬间 `berth-index.db` 被杀软/备份工具独占锁 (常见瞬态) → open 抛 BUSY/EBUSY → 本进程生命周期内所有 load/save/scanHistory 永久 no-op → 下次冷启动无 SWR、历史丢失, 用户无感知 (仅一条日志)
- 期望: 区分错误类别 — 瞬态锁类 (SQLITE_BUSY/EBUSY/EPERM 锁语义) 保留 untried 允许后续调用重试 (可加有界重试间隔防抖); 损坏/永久类才置 null 放弃

## B7 uncaughtException 弹框无节流

- `src/main/index.ts:27-30` — 处理器选择"弹框告知后不强退", 但重复抛错源 (定时器/事件回调循环 throw) → showErrorBox 模态框风暴, 应用不可用
- 期望: 按 message 去重或时间窗节流 (如同一 message 5s 内只弹一次); 日志仍逐条落

## B8 电池初始状态未 seed

- `src/main/index.ts:205-211` — `onBatteryPower` 初始 `false`, 只靠 on-battery/on-ac 事件翻转
- 笔记本用电池启动 → 首次电源状态切换前, 默认开启的 `acOnlyFullScan` 判定恒为"在 AC 上" → 周期全量扫描照样在电池上跑, 违背默认省电策略
- 期望: 初始化用 `powerMonitor.isOnBatteryPower()` seed 一次

## 不入本批 (交叉引用)

- watcher 路径集启动 existsSync 定死的监听盲区 — 设计面大, explore 阶段沉淀 docs/issues
- 渲染层修复族 / IPC 机制加固 (typed registerHandler + sender 校验 + typed emit) / DRY 收敛族 / 巨石拆分 — 独立后续批次

## 验收总纲

- 每项配目标测试; 不适合自动化的装配/文本项 (B1/B7/B8) 给替代验证 (grep/eol 断言可自动化则自动化)
- B5/B6 用 fake db 钉行为; B4 用损坏 fixture 断言 log 记账
- 全局门禁: typecheck / lint / test / harness:check
