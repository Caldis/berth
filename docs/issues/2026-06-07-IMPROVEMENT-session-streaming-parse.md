# 描述
- session 解析对每个 JSONL `fs.readFileSync` 全量读入 + `split(/\r?\n/)` 全文件切分; 大 transcript (MB 级) 首次/缓存失效时内存与 CPU 开销大。

# 证据
- `src/main/adapters/claude-code/parsers.ts:723` `readFileSync` + `split`。
- 有 fingerprint cache 缓解重复读, 但首扫与失效仍全量。

# 预期 / 建议
- 改流式逐行解析 (readline / 按块), 或只读取摘要所需的头尾窗口; 降大文件峰值内存。需保证现有 meta 字段 (token usage/hooks/skills/mcp 聚合) 在流式下行为不变。

# GH-116 增补 (2026-06-11, 会话重放落地后影响面扩大)
- 新增全量读取点: `src/main/engine/session-replay.ts` (replay 解析 + `readSessionReplayEventPayload` 每次点击事件按行反查时整文件 `readFileSync`+split, 59MB/120MB 级真实 transcript 实测存在); `adapters/{claude-code,codex}/session-replay.ts` 解析器同为全量读。
- 解析仍在主进程主线程同步执行 (renderer 异步等待不卡 UI, 但 main 短暂忙): detail 与 replay 双解析已接 `AssetFileCache` 指纹缓存, 重复打开免费, 但首次/失效仍全量 → 建议与本 issue 一并评估 **worker 下沉** (scan worker 已有边界可复用) 与分块流式 IPC。
- 内存: replay 缓存按 path 存未截断事件数组 (120MB rollout ≈ 3.5 万事件 ≈ ~9MB/会话), 无逐出策略; 流式/worker 方案设计时一并处理 (LRU 或 pruneTo 接入)。
- 关联 `docs/works/2026-06-11-gh-116-sessions-list-detail-redesign/` (02-SPEC「明确不做」)。

# GH-148 落地 (2026-06-20, 流式 + LRU 部分完成)
- 路径更正: 上文证据里的 `src/main/...` 路径自 GH-121 起全部迁入 `packages/berth-scan-engine/`; src/main 下只剩 scan-helper / ipc 薄壳。实际 6 个全量读取点 = claude `parseSessionMeta` (adapters/claude-code/parsers.ts) · `parseClaudeSessionDetail` (session-detail.ts) · `parseClaudeSessionReplay` (claude session-replay.ts) · codex `readJsonLines` (parsers.ts, 喂 meta+detail) · `parseCodexSessionReplay` (codex session-replay.ts) · `readSessionReplayEventPayload` (engine/session-replay.ts)。
- **已做**: 新增 `adapters/_shared/jsonl-stream.ts` 同步流式行迭代器 (fs.openSync + 64KB readSync + 跨 chunk 字节缝合 + 按 \n 切 + 去尾 \r + 空行占号), 与 `split(/\r?\n/)` 逐字节等价 (golden + fuzz 双证)。6 读取点全部改流式; `readSessionReplayEventPayload` 流到目标行即 break (单点最大收益)。codex `readJsonLines` 改 generator 去物化 (meta/detail 不再驻留全量 Record[])。
- **已做**: `AssetFileCache` 加可选 LRU 上界 (`maxEntries`/`maxBytes`/`sizeOf`, 插入序 Map, 命中移尾, 超界逐最旧); replayCache 传 maxBytes(64MB)+sizeOf, executionDetailCache 传 maxEntries(256)。**sessionCache / projectScanCache 默认无界, 行为逐字节不变** (snapshot 持久化 + pruneTo 契约红线)。
- **Defer (独立更大 work)**: worker 下沉 + 分块流式 IPC (需新建 request/response 协议, blast radius 大; 同步流式落地后边际收益有限, 与 scan-worker-long-lived 同族)。async readline 全链路放弃 (会逼整链 + 缓存 async 化, 得不偿失)。
- 关联 work: `docs/works/2026-06-20-gh-148-session-streaming-parse/`。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Round-1 #3; Tier-2。关联 `docs/works/2026-06-07-gh-111-scan-engine-review-hardening/` (P3)。
- 状态: PARTIALLY RESOLVED (流式 + LRU 已落地 GH-148; worker 下沉 + 分块流式 IPC 仍 OPEN, 作独立更大 work)。
