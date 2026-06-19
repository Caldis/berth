# 需求分析 (Explore 产物) — GH-143 session-id 契约

## 现状理解

会话 id 多格式并存:
- claude session: `adapters/claude-code/parsers.ts:805` `id: \`session-${sessionId}\``
- codex session: `adapters/codex/parsers.ts:540` `id: \`codex-session-${sessionId}-${hashString(filePath)}\``
- hermes/openclaw session: `assetEntityId('session', ...)` 或 `session-${index+1}` fallback
- 其他资产 (claude-md/skill/agent/mcp): 统一走 `assetEntityId` (`shared/asset-dedupe.ts:41`)

agent-teams 反查 (主进程): `src/main/agent-teams/index.ts:52` 硬拼 `getAsset(\`session-${team.leadSessionId}\`)` — 假设 lead session 是 claude 格式; 改 claude session id 即静默破坏 teams 链接。

codex 坏行: `readJsonLines` (`adapters/codex/parsers.ts:667-677`) catch **静默 ignore**; claude (`parsers.ts:687-695`) 计 `malformedLineCount` 并写 `meta.malformedLineCount` (`:801`)。codex `parseCodexSessionMeta` (`:418`, readJsonLines `:447`) + meta 构造 (`:434`) **无** malformedLineCount → 数据质量可见性不对等。

## 关联与依赖

- session id 是 renderer 持有的不透明句柄 + agent-teams 拼接依赖 → **格式不能变** (改则破坏快照/句柄/teams)。sessionAssetId 短期只**单点化现有格式, 不改格式** (issue 长期才向 assetEntityId 迁移, 需迁移层, 不在本 work)。
- codex readJsonLines 三处消费 (`:404` title-index / `:447` session-meta / `:558` session-detail); 坏行记账只对 session-meta 有 UI 意义 (malformedLineCount 是 session meta 字段)。
- hashString (codex session id 用) 复用来源待 design 确认。

## 任务分类与 debt 校准
- type maintenance / subtype architecture
- source.kind docs-issues / refs: 2026-06-10-IMPROVEMENT-session-id-contract.md
- debt.estimate: incurred 1 / repaid 3 / net -2 (maintenance 降 debt); explore 后维持 (聚焦 codex 记账 + sessionAssetId, 格式不变低风险), confidence low→medium。
- revision: estimate 未变, 不追加。

## 验收标准 (编号, SPEC 与 verify 据此核对)

1. **codex 坏行记账**: codex `parseCodexSessionMeta` 坏行计数 → `meta.malformedLineCount` (>0 时), 对等 claude (真实坏行 jsonl fixture 解析出 malformedLineCount)。
2. **readJsonLines 不静默吞**: codex readJsonLines 加 onMalformed 回调/返回计数, 坏行可被上层记账。
3. **sessionAssetId 格式不变**: `sessionAssetId(agentId, sessionId, filePath?)` claude→`session-${id}`, codex→`codex-session-${id}-${hash}`, 产出 id **完全等于现有硬编码** (golden 钉死)。
4. **id 兼容**: claude `:805` / codex `:540` 改用 sessionAssetId, 资产 id 不变 (快照/句柄兼容, 现有测试不破)。
5. **agent-teams 改契约**: `index.ts:52` 改用 sessionAssetId('claude-code', leadSessionId), 不再硬拼; 反查行为不变。
6. 现有全量测试不破 (id 不变保证)。

## 界面质量与交互验收
不适用 (引擎 parser + 主进程逻辑, 无 UI 变更; codex malformedLineCount 是既有 session meta 字段, UI 已消费 claude 侧)。

## 未决问题 (design)
- **D1 sessionAssetId 落点**: `shared/asset-dedupe.ts` (与 assetEntityId 并列) vs 新 `shared/session-id.ts`? hashString 复用来源 (codex 当前 hashString 定义位置)。
- **D2 readJsonLines 范围**: codex 本地加坏行计数 (最小) vs 提升 _shared 带 onMalformed (issue 建议, 但 claude 是内联非 readJsonLines, 提升需同时改 claude)。倾向首版 codex 本地加计数, _shared 统一列后续。
- **D3 其他 adapter session id**: hermes/openclaw 的 `assetEntityId('session')` 是否纳入 sessionAssetId? 倾向首版聚焦 claude/codex (agent-teams 相关), 其他列后续 (已用 assetEntityId 较规范)。

## 测试策略 (概要)
- unit: sessionAssetId golden (claude/codex 格式 == 现有硬编码); codex parseCodexSessionMeta 坏行 fixture → malformedLineCount。
- 回归: 现有 codex/claude session 测试 (id 不变); agent-teams 测试 (反查不变)。
