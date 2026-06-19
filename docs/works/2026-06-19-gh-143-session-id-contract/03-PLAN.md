# 任务清单 (Design 产物 / 活清单) — GH-143

从 02-SPEC 拆解。顺序执行 (契约函数 → parsers 改用 → codex 记账 → agent-teams), 文件链式依赖。
每项有测试证据或明确例外。

- [ ] 任务 1: `sessionPathHash` + `sessionAssetId` (shared/asset-dedupe.ts)
  - 范围: 加 `sessionPathHash` (djb2 base36, 逐字符 = 现 codex hashString) + `sessionAssetId(agentId, sessionId, filePath?)` (codex→`codex-session-${id}-${hash}`, 否则→`session-${id}`)。
  - tests: `tests/session-id.test.ts` (新): sessionAssetId golden (claude/codex 格式); sessionPathHash 对已知输入产已知 base36 (钉死算法)。
  - verify: 不适用 UI。golden 单测绿 (AC3)。
- [ ] 任务 2: claude/codex parsers 改用 sessionAssetId (id 不变)
  - 范围: claude `parsers.ts:805` → sessionAssetId('claude-code', sessionId); codex `parsers.ts:540` → sessionAssetId('codex', sessionId, filePath); 删 codex 本地 hashString (`:942`) 改 import sessionPathHash。
  - tests: 现有 codex/claude session parser 测试 (`codex-session-parser.test.ts` / claude session 测试) 不破 — 证 id 完全不变 (AC4)。
  - verify: 不适用 UI。回归绿。
- [ ] 任务 3: codex 坏行记账 (readJsonLines onMalformed + malformedLineCount)
  - 范围: codex `readJsonLines` (`:667`) 加可选 onMalformed 回调 (3 处调用仅 session-meta 传); `parseCodexSessionMeta` (`:447`) 累计 → `meta.malformedLineCount` (>0, 对等 claude)。
  - tests: `tests/codex-session-parser.test.ts` 扩展: 含坏行的 jsonl fixture → meta.malformedLineCount == 坏行数; 无坏行 → 无该字段 (AC1/AC2)。
  - verify: 不适用 UI。坏行 fixture 真实解析 (符 runtime-behavior-needs-real-run)。
- [ ] 任务 4: agent-teams 改用 sessionAssetId
  - 范围: `src/main/agent-teams/index.ts:52` `getAsset(\`session-${leadSessionId}\`)` → `getAsset(sessionAssetId('claude-code', leadSessionId))`; 不再硬拼。
  - tests: sessionAssetId('claude-code', x) === `session-${x}` (任务1 golden 已覆盖); 现有 agent-teams 测试 (若有) 不破 (AC5)。
  - verify: 不适用 UI。
- [ ] 任务 5 (收尾, 非实现): 记后续 issue
  - readJsonLines 提升 _shared (claude 内联 + codex) + 其他 adapter session id 纳入 sessionAssetId (D2/D3 边界外)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
