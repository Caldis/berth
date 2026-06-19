# 03-PLAN — 活任务清单

## 实现项 (每项先写/更新测试, 跑通才勾)

### 1. 同步流式迭代器 (基建, 先做)
- [ ] 新增 `adapters/_shared/jsonl-stream.ts`: `iterateJsonlLines(filePath)` (同步 readSync + Buffer 缝合 + \n 切 + 去尾 \r + 空行占号) + 带 lineIndex 变体
  - test: jsonl-stream 单测 — 跨 chunk 缝合 (单行 > 64KB) + 行尾变体 (\n / \r\n / 末尾无换行 / 连续空行 / 空文件) + lineIndex 与 split 逐一致 + UTF-8 多字节跨边界

### 2. 替换 6 读取点 (逐个, golden 钉死)
- [ ] parseSessionMeta (claude parsers.ts) → iterateJsonlLines
  - test: golden deep-equal (旧 readFileSync+split vs 新流式, meta 全字段)
- [ ] parseClaudeSessionDetail (session-detail.ts) → 流式
  - test: golden (toolTimeline + artifacts)
- [ ] parseClaudeSessionReplay (claude session-replay.ts) → 流式带 lineIndex
  - test: golden (SessionReplayEvent[] + id L{idx}B{n} 同序)
- [ ] codex readJsonLines → generator 去物化 (meta/detail 自动获益)
  - test: golden codex meta + detail + malformed onMalformed 计数
- [ ] parseCodexSessionReplay → 流式带 lineIndex
  - test: golden codex replay
- [ ] readSessionReplayEventPayload (engine/session-replay.ts) → 流式提前 break
  - test: golden payload 反查逐字节同 (空行占号 + \r 去除)

### 3. LRU 缓存逐出
- [ ] AssetFileCache 加可选 `{maxEntries, maxBytes, sizeOf}` (插入序 Map LRU); 默认无上界
  - test: LRU 逐出 (超界逐最旧 + 命中移尾) + 默认无界向后兼容
- [ ] replayCache 传 maxBytes+sizeOf; executionDetailCache 传 maxEntries; sessionCache 不动
  - test: replayCache 逐出 + sessionCache 不受影响 (现有扫描缓存用例绿)

### 文档
- [ ] docs/issues/2026-06-07-...session-streaming-parse 状态更新 (流式+LRU done, worker 下沉 defer 记后续 + 路径更正)

## 验收
`pnpm --filter @berth/scan-engine test` (golden 全绿 = 行为不变) + `pnpm test` + typecheck + lint 全绿。内存峰值 perf-only (非 CI 必跑)。
