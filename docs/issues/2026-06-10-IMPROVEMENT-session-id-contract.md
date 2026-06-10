# 描述
- 会话资产 id 三种格式并存 (claude `session-${id}` / codex `codex-session-${id}-${hash36}` / shared assetEntityId 自述 canonical 但两解析器都没用); agent-teams 以字符串拼接 `session-${leadSessionId}` 反查 claude 会话 — id 格式成跨模块隐式契约, 改 id 方案静默破坏 teams 链接。JSONL 行迭代习语三份, 仅 claude 计 malformedLineCount, codex 静默吞坏行 (数据质量可见性不对等)。

# 预期 · 建议
- 短期: 暴露 sessionAssetId(agentId, sessionId, filePath) 单点函数, agent-teams 改调用; readJsonLines 提升 adapters/_shared (带 onMalformed 回调), codex 补齐记账 (行为变更, 需声明+真跑验收)。
- 长期: 向 assetEntityId 迁移需迁移层 (id 是 renderer 持有的不透明句柄)。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R17)。
- 状态: OPEN。
