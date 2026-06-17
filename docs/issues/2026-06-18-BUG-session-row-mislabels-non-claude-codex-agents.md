# 描述
Sessions 列表行 (`src/renderer/src/components/sessions/session-row.tsx:37`) 的 agent chip 用
`session.agentId === 'codex' ? 'Codex' : 'Claude'` 二元判定 — 把**所有非 codex 的 agentId 一律
标成 "Claude"**。berth 实际经 adapter-registry 扫描 8 个 agent (claude-code/codex/cursor/
gemini-cli/github-copilot-cli/opencode/openclaw/hermes-agent), 因此 Cursor/Gemini CLI/Copilot
等的 session 会被**误标为 "Claude"**, 是 provenance 误报 (非仅样式问题)。

# 现状缺口
- `session-row.tsx:37` 二元 else 分支兜底到 "Claude", 无视真实 agentId。
- 同类标签逻辑散落多处 (各自只认 claude/codex): `activity-insights.widget`(已修, 改用统一映射)、
  `hooks-lifecycle-view`、`memory-view`、`search-dialog`、`session-list-filters` 等 — 缺单一真源, 易各自漏配新 agent。
- 已落地单一真源 `src/renderer/src/lib/agent-meta.ts` (`agentDisplayName`, 覆盖 8 个 + 未知回退 Title Case);
  session-row 因属 sessions 功能 (非 GH-138 主线) 暂未接入, 仅记录此处。

# 预期 / 建议
- session-row 改用 `agentDisplayName(session.agentId)` (替换二元判定), 修正误标。
- 注意 chip 文案会从 "Claude" 变 "Claude Code", 需同步更新 `tests/renderer/sessions-pages.test.tsx:450`
  (`getByText('Claude')` → `'Claude Code'`); 并复核 chip 宽度在密集列表下的视觉。
- 顺带审计其余 agent 标签点逐一接入 `agent-meta`, 消除散落判定 (单独小改动批次)。

# 来源 / 关联
- 来源: GH-138 仪表盘 agent 兼容性排查时发现 (用户问"各维度数据展示对不同 agent 兼容性如何")。
- 关联: `docs/works/2026-06-17-gh-138-overview-modular-dashboard`; 统一映射 `lib/agent-meta.ts`;
  仪表盘侧已在 `activity-insights.widget` 接入修复。
- 边界: 属 sessions 功能旁支 bug, 按 AGENTS.md 不在 GH-138 内顺手改; 待排期或用户扩大范围。
