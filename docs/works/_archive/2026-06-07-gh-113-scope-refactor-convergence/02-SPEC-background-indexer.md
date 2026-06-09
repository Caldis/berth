# 技术方案 V2 — 全局后台渐进增量可控资产索引器 (Codex 两轮交叉 review 后终版)

> 触发: 用户 2026-06-07 重定义 [全局]=全设备全部资产完整结果, 扫描须为 spotlight 式后台索引器 (见 `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md`)。
> 调研: 12-agent Workflow (Spotlight/Windows Search/Everything-USN/clangd/IntelliJ/LSP/Git-index/爬虫调度) → `review/research-synthesis.md`。
> 评审: Codex round-1 `review/scan-redesign-round1-codex.md` (收窄: 一致性优先, 重调度后置); round-2 `review/scan-redesign-round2-codex.md` (锐化身份契约 + worker/main 边界)。

## 不变量 (贯穿全程)
- **I1 单管线**: 不存在独立"全扫代码路径"。全扫 = 冷缓存下每个指纹都 miss 的退化; watcher 一个事件 = 同一 `deriveAssetsForPath(path)`。
- **I2 scope=过滤谓词, 非扫描触发器**: 全局索引建立后, 切 scope 只换 `assetMatchesAppScope` 参数, 零 I/O。删 `setProjectDir` 触发重扫。
- **I3 真源持久化**: 最终态 SQLite (better-sqlite3, 已在 deps) 为真源; MiniSearch / 内存快照派生可重建。**SQLite writer 固定 main 单 writer** (worker 跑原生模块在 Electron 有崩溃风险 electron#43513; 同步 API 批量事务 + 批间 setImmediate 让出); worker 只 parse 产 changeset。

## 身份契约 (Pre-T0, 一切地基 — Codex round-1 A1 / round-2 A1-A3,D1)
所有资产 id **确定式**, 形如 `${type}-${scope}-${stableAssetHash(sourceKey + ':' + entityKey)}`, `sourceKey = dedupePathKey(物理路径)`:
- **单文件单资产** (skill/agent/command/output-mode/claude-md/plugin/env/legacy-statusline/plan/todo/history/...): `entityKey=''` → **仅按归一化路径**, **绝不用展示 name** (改标题不得变 id, round-2 A2)。
- **单文件多资产**: hook=`scenarioHash:hookHash` (内容派生, 已稳定 scanner.ts:284); mcp=`serverName`; **project-mcp (`~/.claude.json`) =`projectPathKey:serverName`** (同名跨项目防撞, round-2 A1); permission=`kind`; settings-statusline=`settingKey`。
- 每条带 `meta.sourcePath` + `meta.sourceKey`。canonical merge (AGENTS.md 跨 adapter) 的 merged 行**按 sourceKey 替换** (非 primary 原始路径字符串, round-2 A3), `readByAgentIds`/`displayPaths` 仅 UI。
- **stableAssetHash 加宽** (当前 32-bit djb2 太弱做 DB PK, round-2 D1): 换 sha256 截断 hex (16 字符), 或 DB 另存未 hash 的 sourceKey+entityKey 列做碰撞检测。
- **Codex 侧也统一**到同一 `dedupePathKey`/`stableAssetHash` (现 `hashString(filePath)` 是另一套, round-2 C), 不留另一半不稳。
- 已落地: AGENTS.md (T1) / CLAUDE.md (T4) 已确定式, 是本契约的先行样板。

## 扫描生命周期 (I1 单管线四阶段)
1. **冷启秒出 (SWR)**: 读持久化快照 → 立即 emit (复用 `onPartial`/`applyPartial`) → UI 渲染陈旧数据 + 弱"刷新中"。
2. **两阶段全量校验**: 阶段 A 廉价枚举所有候选 path 做 stat 指纹比对 (不读内容) → 算 miss/新增/删除, UI 渲"已发现 N 项 (局部 loading)"; 阶段 B 仅对 miss parse 并点亮 (优先级: 当前域先, 其它项目长尾后台补)。
3. **稳态增量**: 全量起底后**永不再全扫**, chokidar 事件 → coalesce → `deriveAssetsForPath` → upsert。
4. **空闲兜底**: chokidar 丢事件 (网络盘/容器/原子写) → 空闲对受影响 root 低频 reconcile, **绝不整库 recrawl**。

## 变更检测 + 失效 (Codex round-2 A4-A5,D3)
- **失效键 = stat 快路径 + 窄窗 racy-hash 回退**: 当前 `sameFingerprint` 仅 path+size+mtime (file-cache.ts:96), 漏同秒等长改写 + 跨机 mtime 不稳。仅当 **mtime 接近上次索引时刻 (FS 精度窄窗) 且 size 未变** 才回退读内容 hash, 不普遍全文件 hash; session 大 JSONL 不参与全文件 hash。
- **parser_version purge-on-change**: 每 parser/type 一版本常量, 折进失效检查; bump 即旧版本行当 miss 重 parse (零迁移); 测试守护"parser 改了但 version 没 bump 即失败"。
- **watcher 事件带归一 sourceKey** (非 basename, watcher.ts:68, round-2 A5); **sidecar 依赖图** (`.berth/hooks-state.json` → 反查 owning settings.json 重派生, round-2 A4); unlink 不被 debounce 吞。
- **path→assetIds 反向映射**: 一文件变更**按 sourceKey 整体替换**其先前派生资产, 不 append 重复 (settings.json→N hooks/mcp 原子替换)。

## 调度 / 背压 / 暂停 (收窄: 重机制后置 — round-1 C)
- **T2 起**: 长驻 coordinator (main) + 有界去重队列; worker parse 产 changeset 回传 (非整快照, 消 structured-clone 成本); per-item try/catch + 超时 = importer 隔离 (畸形 session 不杀循环)。
- 优先级队列 (当前域 / 增量 / 后台全量) + coalescing/debounce (awaitWriteFinish stabilityThreshold~250ms + atomic + 同目录合并) + token bucket 限流。
- **协作取消/暂停**: postMessage/checkpoint 轮询 (worker 内循环边界查标志再 break; SAB 后置, round-1 B3); 单调 checkpoint 防旧 full-scan 覆盖新 watcher 结果 (round-2 D6)。
- AIMD / 长驻 worker 池 / SAB → **T4 后置, 实测规模驱动**。

## 进度 / UX (收窄)
- 多 token 进度 (当前域 / 后台各一条) + per-**root** 完成度 (round-2 D7, per-type 后补); 全局空态须等相关 root ≥1 次校验完成才出 (不误导"没有", round-1 A4)。
- per-分类局部 skeleton (非全局 spinner); SWR 切域立即上缓存。
- **delta partial 后置** (T4): renderer 先保留全量替换 (百-低千资产, delta 过早优化, round-1 B4)。

## 持久化 (Codex round-2 B,D4 — 分两步)
- **T1 垫脚石 = JSON AssetSnapshot 持久化** (main `loadSnapshot/saveSnapshot` 到 userData, SWR; **非** AssetFileCache 后端): 冷启秒出, 改动最小, 不碰 worker/SQLite 边界。换 SQLite 时这层可替换, 返工小。
- **真持久化 = SQLite** (T2 changeset 协议settled 后): `file_fingerprint`(path PK/size/mtime/content_hash/indexed_at/parser_version) + `asset`(id PK/source_key/.../payload_json/source_status)。**先不做 asset_raw 大表** (round-2 D4/A7): raw (大 transcript/敏感) 按需从磁盘读, DB 只存摘要/metadata。WAL; 每 path/batch 一事务 = fingerprint upsert + DELETE asset WHERE source_key=? + insert 新派生 + checkpoint bump; **parse error 先出 changeset 再标 source_status=error, 保留旧 asset 行** (round-2 D5/A4)。

## 复用已落地地基 (不动)
- T1 dedup `mergeSharedConventions`/`dedupeKey` (确定式幂等); T3a owner 谓词 `assetMatchesAppScope`/`assetMatchesProjectPath` (I2 narrow-down 现成实现); 确定式 id (AGENTS.md/CLAUDE.md); `projectScopeCandidatesFromAssets` (项目发现); `AssetFileCache` 指纹状态机 (hit/miss/deleted/error); `onPartial`/`applyPartial`; `annotateEquivalentHookSources`。

## 分层实施 (终版, 每 tier 独立可验 + 小步提交)
- **Pre-T0 身份契约 (第一个 PR, 一切地基)**: Claude 全 `makeId` 资产 → 确定式 id (entityKey 方案); project-mcp 加 projectPathKey; 单文件资产用归一化路径非 name; Codex 统一到 dedupePathKey/stableAssetHash; stableAssetHash 加宽; 每条 meta.sourceKey。**顺带修 makeid 选中/raw 丢失 bug** (issue 2026-06-07-BUG-claude-makeid)。
- **T0 正确性快赢 (Pre-T0 后并行)**: ①racy-hash 窄窗失效; ②watcher debounce/coalescing + 事件带 sourceKey (unlink 不吞)。[MiniSearch changeset 砍出 T0, 后置 — round-2 D2]
- **T1 冷启垫脚石**: JSON AssetSnapshot 持久化 (main, SWR)。
- **T2 单管线 + changeset 协议 + SQLite**: deriveAssetsForPath; worker parse→changeset→main 写; canonical merge 写库前显式 (sourceKey 替换); sidecar 依赖图; parse-error 保留旧行; 单调 checkpoint; SQLite 真源接入。
- **T3 全局后台 + 纯过滤 + 完成度**: 后台全量扫全设备 (删/降级 appendShallowConventions); setProjectDir→纯过滤 (所有 server-side 入口统一谓词: search/sessions/health/usage); per-root 完成度; 设备级统一 watcher (运行时增删根)。
- **T4 后置 (实测驱动)**: delta partial / session byte-offset tail / FTS5 / SAB / AIMD / 长驻 worker 池 / 丰富 knob / 暂停-恢复 UI + 设置档位。

## 风险
- R1 一致性: 多 worker 并行 + 中途切项目需版本化/checkpoint 隔离 (round-2 D6)。
- R2 全局虚假完整: 靠 per-root 完成度 + skeleton (不误导)。
- R3 冷启大规模: 两阶段 (stat 先 parse 后) + 优先级带 + JSON 冷启秒出。
- R4 watcher 跨平台不可靠: 空闲 reconcile 兜底不 recrawl。
- R5 better-sqlite3: 固定 main 单 writer 批量+让出; 原生模块按 arch 分发 (见 build friction)。
- R6 sidecar/辅助输入依赖: 依赖图覆盖 hooks-state sidecar (round-2 A4)。
