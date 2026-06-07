# 描述
- GH-113 把"全局"重定义为"设备上所有可扫描资产", 并实现了**会话派生项目根级约定 (AGENTS.md/CLAUDE.md) 的浅索引** → 全局 [约定] 现显示所有项目的约定。
- 但浅索引**仅覆盖约定 (instruction conventions), 不含能力 (skill/agent/command/hook/mcp/statusline 等)**。因此全局下 [技能]/[Hooks]/[MCP] 等能力页只显示**活动项目 + 用户级**, 不含其它项目的能力。
- 这是 Codex 两轮 review 确定的**性能取舍** (R-D2/A2: 非活动项目不扫全部 `.claude`/`.codex`, 仅根级约定), 与用户字面诉求"全局=所有资产"存在边界差。

# 证据
- `src/main/engine/shallow-conventions.ts` `SHALLOW_SOURCES` 仅 AGENTS.md/CLAUDE.md。
- `src/main/engine/scanner.ts` `appendShallowConventions` 仅对非活动项目浅扫约定。
- 用户原始诉求: "全局就是用户设备上所有能被扫描出来的资产"。

# 预期 / 建议
- 若需全局也显示其它项目的能力, 评估**扩展浅索引到能力类型** (或 on-demand 惰性深扫被浏览的项目)。需重新评估性能 (几十项目 × 全 `.claude`/`.codex`), 与 Codex B① 的"独立后台 worker + mtime 缓存"一并设计。
- 或在 UI 明示"非活动项目仅浅索引约定, 选中项目查看完整能力" (scanDepth='shallow' 已在 meta, 可做提示徽标)。

# 决议 (2026-06-07, 用户澄清)
- 用户明确: conventions-only 是 **BUG**; [全局] 必须是全设备**全部资产**的完整结果, 启动即后台扫全部, 切 scope 仅 narrow-down。
- **本 IMPROVEMENT 被取代**: 完整需求与执行见 [[2026-06-07-FEATURE-background-progressive-asset-indexer]]。

# 来源 / 关联
- GH-113 实现边界 (T3b 浅索引)。关联 `docs/works/2026-06-07-gh-113-scope-refactor-convergence/`。
- 状态: SUPERSEDED by FEATURE-background-progressive-asset-indexer。
