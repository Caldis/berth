# 03-PLAN — 活任务清单

## 实现项 (每项先写/更新测试, 跑通才勾)

### 1. 同步流式迭代器 (基建, 先做)
- [x] 新增 `adapters/_shared/jsonl-stream.ts`: `iterateJsonlLines(filePath)` (同步 readSync + Buffer 缝合 + \n 切 + 去尾 \r + 空行占号) + 带 lineIndex 变体 (`iterateJsonlLinesWithIndex`)
  - [x] test: jsonl-stream 单测 (`packages/berth-scan-engine/tests/jsonl-stream.test.ts`, 9 例) — 跨 chunk 缝合 (单行 200KB > 64KB) + 行尾变体 (\n / \r\n / 末尾无换行 / 连续空行 / 空文件) + lineIndex 与 split 逐一致 + UTF-8 多字节跨边界 (4 字节 emoji / 3 字节 CJK 跨界) + CRLF 跨界 + 200 例 fuzz 全部 == split

### 2. 替换 6 读取点 (逐个, golden 钉死)
- [x] parseSessionMeta (claude parsers.ts) → iterateJsonlLines
- [x] parseClaudeSessionDetail (session-detail.ts) → 流式 (移除孤儿 fs import)
- [x] parseClaudeSessionReplay (claude session-replay.ts) → 流式带 lineIndex (try 包迭代, 失败返回已解析部分)
- [x] codex readJsonLines → generator 去物化 (meta/detail/title-index 自动获益; 加单次性注释)
- [x] parseCodexSessionReplay → 流式带 lineIndex
- [x] readSessionReplayEventPayload (engine/session-replay.ts) → 流式到目标行即 break
  - [x] test: golden 行为不变铁证 (`tests/unit/session-streaming-golden.test.ts`, 9 例) — meta/detail/replay deep-equal (新流式 vs split-canonical 双文件, claude+codex) + replay id L{idx}B{n} 同序 + payload 反查 `payload.json === split[lineIndex]` 逐字节同 + 全对象无 \r。反向证伪: 故意去掉 \r 剥离 → golden 3 例失败 (确认载荷有效)。原有 session-meta/codex/replay/detail 套件保持绿。

### 3. LRU 缓存逐出
- [x] AssetFileCache 加可选 `{maxEntries, maxBytes, sizeOf}` (插入序 Map LRU, 命中移尾 + 超界逐最旧, 仅 bounded 时重排); 默认无上界
- [x] replayCache 传 maxBytes(64MB)+sizeOf; executionDetailCache 传 maxEntries(256); sessionCache/projectScanCache 不动
  - [x] test: LRU 逐出 (`tests/unit/asset-file-cache.test.ts` +5 例) — maxEntries 逐最旧 + 命中移尾改变逐出对象 + maxBytes 加权逐出 + 单超界值保留 + 默认无界 50 入 0 逐快照 round-trip。原有 5 例 + scanner/scan-bridge (sessionCache) 全绿。

### 文档
- [x] docs/issues/2026-06-07-IMPROVEMENT-session-streaming-parse.md 状态更新 (流式+LRU done → PARTIALLY RESOLVED, worker 下沉 defer + 路径更正)

## 验收
- [x] `pnpm --filter @berth/scan-engine typecheck` 绿; `pnpm --filter @berth/scan-engine test` 108 例绿 (含 jsonl-stream 9)。
- [x] `pnpm test` 全 180 文件 1297 例绿 (含 golden 9 + LRU 新 5 + 全部原 session/scanner/IPC 套件)。
- [x] 触动文件 eslint 全绿。
- 内存峰值 perf-only (非 CI 必跑), 本轮未单测; 收益已由 "去物化 + 流到目标行 break + LRU 上界" 结构性保证。
