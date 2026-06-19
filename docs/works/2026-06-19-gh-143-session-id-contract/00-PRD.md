# PRD 快照 (只读)

> 原始来源的快照。任何阶段不回写。

来源:
- docs/issues/2026-06-10-IMPROVEMENT-session-id-contract.md
- GitHub Issue: https://github.com/Caldis/berth/issues/143

## 正文 (来源 issue 快照)

### 描述
- 会话资产 id 三种格式并存 (claude `session-${id}` / codex `codex-session-${id}-${hash36}` / shared `assetEntityId` 自述 canonical 但两解析器都没用); agent-teams 以字符串拼接 `session-${leadSessionId}` 反查 claude 会话 — id 格式成跨模块隐式契约, 改 id 方案静默破坏 teams 链接。JSONL 行迭代习语三份, 仅 claude 计 `malformedLineCount`, codex 静默吞坏行 (数据质量可见性不对等)。

### 预期 · 建议
- 短期: 暴露 `sessionAssetId(agentId, sessionId, filePath)` 单点函数, agent-teams 改调用; `readJsonLines` 提升 `adapters/_shared` (带 onMalformed 回调), codex 补齐记账 (行为变更, 需声明+真跑验收)。
- 长期: 向 `assetEntityId` 迁移需迁移层 (id 是 renderer 持有的不透明句柄)。

### 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R17)。
- 状态: OPEN。

## 2026-06-19 核实 (5.2 收敛排期)
- codex `readJsonLines` (`adapters/codex/parsers.ts:667-677`) catch 静默 ignore 坏行; claude (`adapters/claude-code/parsers.ts:693`) 计 malformedLineCount — 不对等确认仍在。
- `sessionAssetId` 未创建 (git grep 无匹配)。
