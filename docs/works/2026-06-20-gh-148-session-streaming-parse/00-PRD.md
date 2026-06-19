# 来源快照 (只读输入)

## 源 issue
- `docs/issues/2026-06-07-IMPROVEMENT-session-streaming-parse.md` (含 GH-116 增补: 会话重放落地后影响面扩大)

## 现状
session JSONL 解析对每文件 `fs.readFileSync` 全量读入 + `split(/\r?\n/)` 全文件切分; 大 transcript (MB 级, 59/120MB 实测) 首次/缓存失效时内存 + CPU 峰值大。
全量读取点: `claude-code/parsers.ts:723` 附近 + `engine/session-replay.ts` (replay 解析 + `readSessionReplayEventPayload` 每事件整文件读) + `adapters/{claude-code,codex}/session-replay`。replay 缓存按 path 存未截断事件数组无逐出策略。

## 目标 (范围 explore 后定)
- 流式逐行解析 (readline / 分块) 替代 readFileSync+split, 保 meta 聚合 (token usage / hooks / skills / mcp) 行为不变 (golden 钉死)。
- replay 缓存 LRU / pruneTo 逐出。
- worker 下沉 + 分块流式 IPC 视 explore 评估 (可能 defer 为更大独立 work)。

由 harness-5.2-issues 下一波 (用户选 session-streaming-parse) 生成。
