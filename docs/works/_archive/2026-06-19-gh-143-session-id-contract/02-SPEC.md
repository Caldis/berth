# 技术方案 (Design 产物) — GH-143 session-id 契约

每条回指 01-ANALYSIS 验收标准 (AC1-6)。

## 决策汇总
- **D1**: `sessionAssetId` + `sessionPathHash` 放 `shared/asset-dedupe.ts` (与 assetEntityId 并列)。codex hashString (`parsers.ts:942`, djb2 base36 32-bit) 提升为 shared `sessionPathHash` (**区别于** stableAssetHash 的 SHA-256); sessionAssetId codex 格式复用它, 保证 id **完全不变**。
- **D2**: `readJsonLines` (codex `parsers.ts:667`) 加可选 `onMalformed` 回调; `parseCodexSessionMeta` (`:447`) 传回调累计 → `meta.malformedLineCount`。codex 本地, _shared 提升列后续。
- **D3**: sessionAssetId 聚焦 claude/codex; 其他 adapter (hermes/openclaw 的 `assetEntityId('session')`) 列后续。

## 数据契约
- `sessionPathHash(value: string): string` — djb2 base36 (逐字符 = 现 codex hashString, golden 钉死)。
- `sessionAssetId(agentId: string, sessionId: string, filePath?: string): string`:
  - `agentId === 'codex'` → `` `codex-session-${sessionId}-${sessionPathHash(filePath ?? '')}` ``
  - 否则 → `` `session-${sessionId}` `` (claude-code / claude / default)
- `readJsonLines(filePath, onMalformed?: () => void)` — catch 块内调 `onMalformed?.()`。

## 模块结构 / 组件拆分
- `shared/asset-dedupe.ts`: +`sessionPathHash` +`sessionAssetId`。
- `adapters/claude-code/parsers.ts:805`: `id` → `sessionAssetId('claude-code', sessionId)`。
- `adapters/codex/parsers.ts:540`: `id` → `sessionAssetId('codex', sessionId, filePath)`; 删本地 hashString (`:942`) 改 import sessionPathHash; `readJsonLines` (`:667`) 加 onMalformed。
- `adapters/codex/parsers.ts:447` (parseCodexSessionMeta): 传 onMalformed 累计 → `meta.malformedLineCount` (>0 时, 对等 claude `:801`)。
- `src/main/agent-teams/index.ts:52`: `getAsset(sessionAssetId('claude-code', leadSessionId))`。

## 界面质量与交互验收
不适用 (引擎 parser + 主进程逻辑, 无 UI; malformedLineCount 是既有 session meta 字段)。

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外 |
|---|---|---|---|---|
| sessionAssetId golden: claude `session-${id}` / codex `codex-session-${id}-${hash}` == 现有 | unit | `tests/session-id.test.ts` (新) | `pnpm --filter @berth/scan-engine test` | - |
| sessionPathHash 同输入 == 现 codex hashString (逐字符算法) | unit | 同上 | 同上 | - |
| codex parseCodexSessionMeta 坏行 fixture → malformedLineCount | unit | `tests/codex-session-parser.test.ts` (扩展) | 同上 | - |
| claude/codex session id 回归不变 | unit | 现有 codex/claude session parser 测试 | 同上 | id 不变保证 |
| agent-teams 反查 id 不变 | unit | 现有 agent-teams 测试 / sessionAssetId golden | `pnpm test` | sessionAssetId('claude-code',x)==`session-${x}` 已 golden |

## 验收标准映射
| SPEC 项 | AC |
|---|---|
| codex onMalformed + malformedLineCount | AC1, AC2 |
| sessionAssetId golden | AC3 |
| parsers 改用 id 不变 | AC4 |
| agent-teams sessionAssetId | AC5 |
| 全量回归 | AC6 |

## 任务分类与 debt
- type maintenance / subtype architecture; source docs-issues。
- debt.estimate: incurred 1 / repaid 3 / net -2 (maintenance 降 debt)。
- debt.final 预期: net ≈ -2 (单点化 + 记账, 格式不变低风险)。
- Project 字段: 随 archive done 同步。
