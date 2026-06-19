# 描述
- 会话资产 id 三种格式并存 (claude `session-${id}` / codex `codex-session-${id}-${hash36}` / shared assetEntityId 自述 canonical 但两解析器都没用); agent-teams 以字符串拼接 `session-${leadSessionId}` 反查 claude 会话 — id 格式成跨模块隐式契约, 改 id 方案静默破坏 teams 链接。JSONL 行迭代习语三份, 仅 claude 计 malformedLineCount, codex 静默吞坏行 (数据质量可见性不对等)。

# 预期 · 建议
- 短期: 暴露 sessionAssetId(agentId, sessionId, filePath) 单点函数, agent-teams 改调用; readJsonLines 提升 adapters/_shared (带 onMalformed 回调), codex 补齐记账 (行为变更, 需声明+真跑验收)。
- 长期: 向 assetEntityId 迁移需迁移层 (id 是 renderer 持有的不透明句柄)。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R17)。
- 状态: RESOLVED (短期方案核心由 GH-143 兑现, 2026-06-19)。

# 解决 (2026-06-19, GH-143)
- 短期方案核心兑现 (`docs/works/_archive/2026-06-19-gh-143-session-id-contract`):
  - `sessionAssetId(agentId, sessionId, filePath?)` 单点函数 (`shared/asset-dedupe.ts`) 收编 claude
    `session-${id}` / codex `codex-session-${id}-${hash}` 两历史格式 (golden 钉死, 格式 byte-identical);
    claude/codex parsers + agent-teams 反查全改用, 不再硬拼 → 改 id 不再静默破坏 teams 链接。
  - codex `readJsonLines` 加 onMalformed; `parseCodexSessionMeta` 累计 → `meta.malformedLineCount`,
    对等 claude, 数据质量可见性补齐。
  - 关联 commit: 50eed8fa。测试: session-id golden 7 + codex 坏行 2 + 1248 全量回归 (id 不变)。
- 剩余 (低优可选未来, 不阻塞): readJsonLines 提升 _shared 统一 claude 内联 + codex; 其他 adapter
  (hermes/openclaw) session id 纳入 sessionAssetId; 长期向 assetEntityId 迁移 (需迁移层, id 是 renderer 句柄)。
- 收敛: 短期核心已兑现, 移入 resolved/。
