# 描述
- session 解析对每个 JSONL `fs.readFileSync` 全量读入 + `split(/\r?\n/)` 全文件切分; 大 transcript (MB 级) 首次/缓存失效时内存与 CPU 开销大。

# 证据
- `src/main/adapters/claude-code/parsers.ts:723` `readFileSync` + `split`。
- 有 fingerprint cache 缓解重复读, 但首扫与失效仍全量。

# 预期 / 建议
- 改流式逐行解析 (readline / 按块), 或只读取摘要所需的头尾窗口; 降大文件峰值内存。需保证现有 meta 字段 (token usage/hooks/skills/mcp 聚合) 在流式下行为不变。

# 来源 / 关联
- Codex×Claude 对抗审查 (GH-111) Round-1 #3; Tier-2。关联 `docs/works/2026-06-07-gh-111-scan-engine-review-hardening/` (P3)。
- 状态: OPEN。
