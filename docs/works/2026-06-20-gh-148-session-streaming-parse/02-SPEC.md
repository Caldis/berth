# 02-SPEC — Design 产物

## 范围切分 (三红线下全部削峰收益)
红线: **不改 parser 同步契约 / 不改 IPC 协议 / 不改缓存持久化契约**。越过任一即升级为更大 work。

**本 work 做**:
1. 同步流式行迭代器 + 替换 6 读取点 (含 codex readJsonLines 去物化)。
2. readSessionReplayEventPayload 流式提前 break (单点最大收益)。
3. replayCache / executionDetailCache LRU 上界。

**Defer (独立更大 work)**:
- worker 下沉 + 分块流式 IPC (需新建 request/response 协议, blast radius 大, A 落地后边际收益有限, 与 scan-worker-long-lived 同族)。
- async readline 全链路 (逼整链 + 缓存 async 化, 得不偿失)。

## A. 同步流式迭代器 (关键决策: 同步 chunk 读, 非 async readline)
**约束**: 全部 6 parser 同步 + `AssetFileCache.read` 期望同步 parse + buildSessionDetail/Replay 同步 + cli.ts 等同步调用。async readline 会逼整链 async 化 → blast radius 远超本 work。
**方案**: 新增 `packages/berth-scan-engine/src/adapters/_shared/jsonl-stream.ts` 导出 `iterateJsonlLines(filePath): Iterable<string>` (内部 `fs.openSync` + `Buffer.alloc(64KB)` + `readSync` 循环, 跨 chunk 缝合半行, yield 完整行)。峰值内存 = 一个 chunk + 当前行, 不再驻留整文件 string。**保持同步签名 → 现有调用 / 缓存 / CLI 零改动**。replay 需行号 → 提供带 index 变体 (空行也占号, 与 split 一致)。
逐文件替换: claude parsers.ts(parseSessionMeta) / session-detail.ts / claude session-replay.ts(带 lineIndex) / codex parsers.ts(readJsonLines 改 generator 去物化) / codex session-replay.ts / engine/session-replay.ts(readSessionReplayEventPayload 流式 break)。

## B. LRU (AssetFileCache 加可选容量上界)
构造接受 `{maxEntries?, maxBytes?, sizeOf?}`; entries 用插入序 Map 实现 LRU (命中 delete+set 移尾, 超界从头逐出)。replayCache 传 maxBytes + sizeOf (按内存优先, MB 级); executionDetailCache 传 maxEntries。**sessionCache 不传上界 (默认无界, 行为不变 — 它有 snapshot 持久化 + pruneTo 契约, 红线)**。

## 文件边界
- `packages/berth-scan-engine/src/adapters/_shared/jsonl-stream.ts` (新增)
- `adapters/claude-code/{parsers,session-detail,session-replay}.ts`
- `adapters/codex/{parsers,session-replay}.ts`
- `engine/session-replay.ts` + `engine/session-detail.ts`
- `engine/assets/file-cache.ts` (LRU 上界)
- `packages/berth-scan-engine/tests/unit/**` (新增/扩展)

## 测试矩阵
- **golden 行为不变 (核心)**: 同 tmp transcript 旧路 (readFileSync+split) vs 新流式路 **deep-equal** 整返回对象 (meta / detail / replay, claude+codex)。
- 跨 chunk 缝合 (单行 > 64KB, UTF-8 多字节按字节缓冲)。
- 行尾变体 (\n / \r\n 混合 / 末尾无换行 / 连续空行 / 空文件)。
- **lineIndex 不变式**: 空行也占号 (与 split 一致), replay id `L{idx}B{n}` 新旧同序, payload 反查逐字节同。
- malformed 计数不变。LRU 逐出 + sessionCache 不受影响。缓存指纹契约 (现有用例绿)。
- 内存峰值 (弱, 相对断言 + 宽松阈值, perf-only 非 CI 必跑)。

## 红线/风险 (implement 必守)
1. **lineIndex 空行占号**必须与 `split(/\r?\n/)` 一致 (否则 payload 反查错位) — 最易错隐性契约。
2. **跨 chunk 半行**: 按字节 Buffer 缝合, 遇 \n 才 decode 该行 (不逐 chunk decode 拼字符串, 防 UTF-8 替换字符)。
3. **\r\n**: split(/\r?\n/) 吃 \r; 流式按 \n 切需去尾 \r (否则 payload json 多 \r → golden 失败)。
4. **流式失败** (文件截断/锁): try/catch 兜底, 已读部分结果照常返回 (generator 在 try 内迭代), 非全有或全无。
5. **LRU 红线**: 只给 replayCache / executionDetailCache, 不动 sessionCache; AssetFileCache 容量参数默认无上界 (向后兼容)。
6. **codex readJsonLines generator 一次性** (已确认调用方单次 for...of, 加注释防误用)。
