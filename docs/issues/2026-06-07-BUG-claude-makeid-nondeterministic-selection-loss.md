# 描述
- claude 适配器多数 parser 用 `makeId(type)` = `${type}-${Date.now()}-${n}` 生成 id (非确定式), 每次全量扫描同一文件得到不同 id。
- id 被渲染层当不透明句柄消费 (选中态、raw 内容重取): 触发刷新/重扫后, 之前选中的资产 id 失效 → 选中丢失、`window.api.assets.get(id)` 取不到 → raw 面板空白。

# 证据
- `src/main/adapters/claude-code/parsers.ts:14-16` `makeId` 含 `Date.now()`; 被 `parseClaudeMd`/`parseSkill`/`parseAgent`/`parseCommand`/`parseOutputMode`/`parseMcpServers`/`parseHooks`/... 复用。
- 消费方按不透明 id: `src/renderer/src/components/shared/view-raw-button.tsx:13`、`src/renderer/src/pages/instructions.tsx:512`、`src/main/engine/assets/runtime.ts:161-162`。
- 对照: codex 适配器 parser id 全部确定式 (`...-${hashString(filePath)}`), 无此问题。
- Codex×Claude 对抗审查 (GH-113) round-2 A1/A4 指出 (AGENTS.md 与 CLAUDE.md 同源)。

# 预期 / 建议
- 所有 claude parser id 改确定式 (path[+scope/entity] 派生), 与 codex 一致; 多实体文件 (settings.json 的 hook/mcp) 需 path+entity 复合键, 不可仅 path。
- 复用 `src/shared/asset-dedupe.ts` 的 `dedupePathKey`+`stableAssetHash` (GH-113 T1 已为 AGENTS.md 落地)。

# 进展
- AGENTS.md: 已确定式化 (GH-113 T1, 提交 c9d330c2)。
- CLAUDE.md: 已确定式化 (GH-113 T4, `claude-md-${scope}-${hash(dedupeKey)}`)。
- **仍 OPEN (本 issue 跟踪剩余类型)**: `parseSkill`/`parseAgent`/`parseCommand`/`parseOutputMode`/`parseMcpServers`/`parseHooks`/`parsePermissions`/`parseEnv`/`parseStatusline*`/`parsePlugin`/`parsePlan`/`parseTodo`/`parseHistory`/... 仍用 `makeId(Date.now)`。多实体文件 (settings.json 的 hook/mcp) 需 path+entity 复合稳定键, 不可仅 path。

# 来源 / 关联
- GH-113 T1 实施中发现。复用 `src/shared/asset-dedupe.ts` `dedupePathKey`+`stableAssetHash`。
- 关联 `docs/works/2026-06-07-gh-113-scope-refactor-convergence/` (T1/T4)。
- 状态: OPEN (AGENTS.md/CLAUDE.md 已修, 余下类型待批量确定式化)。
