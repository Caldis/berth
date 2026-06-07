你是资深 Electron/TypeScript + 索引系统架构师, 对 berth 扫描器重构设计做**第一轮对抗式 review**。怀疑态度找正确性/性能/架构/可维护缺陷。

## 约束
- 禁联网 (已 --disable web_search)。只读仓库代码验证设计可行性。
- 用 grep/跳读定位, 不逐字通读全部文件 (上轮经验: 全读会耗尽上下文)。
- 输出严格简洁中文。

## 背景
berth: Electron 33 桌面应用 (electron-vite, React 19, Zustand, worker_threads, better-sqlite3 已在 deps 但 src/main 未用, chokidar, glob, MiniSearch), 扫描本机 Claude Code/Codex 资产 (settings/mcp/skills/agents/commands/hooks/约定 CLAUDE.md+AGENTS.md/sessions/plugins)。
用户重定义 (不可妥协): **[全局]=全设备全部资产 (所有项目+用户+企业 × 全类型) 的完整结果, 启动即后台扫全部, 切 用户/项目 scope 仅是对已扫结果 narrow-down 过滤 (永不触发扫描)**; 扫描须为 spotlight/Windows-Search 式后台渐进增量可暂停可配置索引器。
已落地可复用地基: AGENTS.md 去重 (`mergeSharedConventions`/`dedupeKey`), owner 谓词 (`assetMatchesAppScope`/`assetMatchesProjectPath`), 确定式 id, `AssetFileCache` 指纹状态机, `onPartial` 渐进通道。

## 待 review 的设计 (round-1 输入)
**请先读 `docs/works/2026-06-07-gh-113-scope-refactor-convergence/review/research-synthesis.md` (完整设计)。** 核心:
- 三不变量: I1 单管线 (full = 冷缓存全 miss 的退化, watcher 事件走同一 `deriveAssetsForPath`); I2 scope=过滤谓词非扫描触发器 (删 setProjectDir 重扫); I3 SQLite 真源 (MiniSearch/内存快照派生)。
- SQLite 数据模型: `file_fingerprint`(path PK/size/mtime/content_hash/indexed_at_ms/parser_version/scan_depth/durability/parsed_byte_offset) + `asset`(id PK/source_path FK/.../payload_json) + `asset_raw` + `catalog_meta`(schema_version/checkpoint/reset_signature)。WAL。
- 4 阶段生命周期: 冷启读 DB 秒出(SWR) → 两阶段全量校验(stat 先/parse 后) → chokidar 稳态增量 → 空闲 reconcile 兜底(不 recrawl)。
- 失效: Git-index stat 快路径 + racy(mtime≥indexed_at)回退 content-hash; parser_version purge-on-change; checkpoint+signature 重启恢复; path→asset 反向映射 (修 `watcher.ts:68` assetId=basename 缺陷); session JSONL byte-offset tail 增量。
- 调度: 长驻 coordinator + 固定 worker 池 (取代每扫 new Worker) + 3 优先队列(当前域/增量/后台全量) + coalescing/debounce(awaitWriteFinish/atomic/同目录合并, watcher 当前完全无 debounce) + token bucket 限流 + 协作取消/暂停(AbortController+checkpoint, worker 内须主动查 signal)。
- UX: delta partial(替代全量累积) + 多 token 进度(当前域/后台各一条) + per-分类 skeleton(非全局 spinner) + SWR。
- 可配置 knob 表 (性能档位/并发/debounce/token 速率/排除路径/电池暂停/空闲全速...); berth 当前无 app 级设置持久化。
- 迁移: 复用 T1 dedup/T3a 谓词/确定式 id; Tier 0(watcher debounce + MiniSearch changeset + racy-hash, 可并行) → Tier 1(SQLite 持久化) → Tier 2(单管线+调度器) → Tier 3(全索引+UX, 删/降级 appendShallowConventions) → Tier 4(session FTS5/durability/AIMD, 按需)。

关键代码锚点 (核实用): `src/main/engine/assets/file-cache.ts:96` (sameFingerprint 仅 path+size+mtimeMs); `src/main/engine/watcher.ts:42-44,68` (无 debounce + assetId=basename); `src/shared/scope.ts:83-91` (owner 谓词); `src/main/engine/scanner.ts:336`(mergeSharedConventions) `:261`(appendShallowConventions 待降级); `src/main/engine/assets/runtime.ts` (snapshotCache/isCurrent 守护/search); `src/main/engine/assets/worker-host.ts` (每扫 new Worker + 双向 clone sessionCache)。

## 你要做 (对抗式, 给 file:line + 具体理由)
A. 设计最大的 **3-5 个**正确性/性能/架构风险或缺陷。尤其审: I1 单管线对 berth 多实体文件(settings.json→N hooks/mcp)与多 adapter 共享文件(AGENTS.md)的 path→assetIds 替换语义是否成立; better-sqlite3 同步 API 放 worker 还是 main、事务边界与批量写; 协作取消在 worker_threads 的真实可行性(SAB vs postMessage); delta partial 与崩溃恢复一致性; "全局虚假完整"(后台没扫完时 global 返回不全, 违背"看不到=没有"); 冷启动百项目规模。
B. 逐一回答设计 §8 的 6 个开放问题: ①浅约定(appendShallowConventions)删除还是保留为 low-durability fallback; ②@parcel/watcher(getEventsSince 离线增量) vs 加固 chokidar+持久 cursor; ③SharedArrayBuffer 取消通道在 Electron 可行性 vs postMessage 轮询; ④delta partial vs 全量替换(berth 资产量 百-低千, 是否过早优化); ⑤durability 分层标注准确性(标错漏更新); ⑥session 进 SQLite FTS5 vs 统一 MiniSearch。
C. 有无更简/更优方案, 或被高估的复杂度 (考虑 berth 资产量百-低千, 哪些是过早优化可砍)。
D. 推荐的**最小可独立落地第一个增量** + Tier 顺序调整 + 每层最易踩的坑 (编号)。
格式: A/B/C/D 四段; A/D 用编号; 简洁。
