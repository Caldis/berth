# 描述
首页仪表盘所有 widget 的数据都是**全 agent 混合**且**无法按 agent 过滤/区分**。berth 实际扫描
8 个 agent, 但仪表盘把它们的 session/token/cost/skill/mcp/model/活动 全部聚合在一起呈现, 用户无法
回答"这些数字里 Claude Code 占多少、Codex 占多少、Cursor 占多少"。对一个"可视化 AI agent 资产"的
工具, 这是核心维度的缺失。

# 现状缺口
- **数据流不传 agentView**: `insights-context` 调 `useDashboardInsights(365, projectPath)`、各 usage
  widget 调 `useUsageSummary(30, undefined, projectPath)` — agentView 槽位恒为空 → runtime 走
  `sessionMatchesAgentView(asset, undefined)` = 'all', 全 agent 混合。
- **AgentView 枚举被钳死在 2 个 agent**: `shared/types/asset.ts` `AgentView = 'all' | 'claude' | 'codex'`;
  `runtime.ts:983 sessionMatchesAgentView` 只有 claude/codex 分支 — 其余 6 个 agent **只能在 'all'
  下出现, 无法被过滤到**。即使接了 agentView, 也只能切 claude/codex。
- **仪表盘 host 无 agent 选择器**: `overview.tsx` 只有 scopeSelection (项目维度), 无 agent 维度入口。
- **维度数据质量随 agent 而异, 但无标注**: skill/mcp 榜与 token 分项 (cache/reasoning) 实质偏
  claude-code; 其它 agent 贡献少/无, 却以"全局"呈现, provenance 不透明。

# 预期 / 建议
- **数据驱动的 agent 维度**: 不要继续用 2 值枚举。利用已有 `insights.agentSplit` (含全部 agentId+count)
  在仪表盘派生"在场 agent"列表, 把所选 agentId 作为过滤参数下沉 runtime (按精确 agentId 过滤, 取代
  受限的 AgentView)。这是泛化, 不破坏 sessions/hooks 现有 AgentView 用法 (可并存或迁移)。
- **Overview 加紧凑 agent 选择器** (toolbar, 与 scope 并列), 切换即重取 insights + usage; 默认 'all'。
  注意 e2e `overview-hero` 断言, DOM 改动前先 grep `tests/e2e`。
- **provenance 透明**: agent 特定维度 (skill/mcp 等) 在多 agent 在场时标注口径, 或随过滤自然收敛。
- **可选新维度 widget**: "agent 覆盖/分布" (各 agent session/token 占比) — 用 agentSplit, 直接可视化兼容覆盖面。
- 跨层契约改动 (AgentView 泛化) 建议作为独立增量, 落代码前在 design 决策一次, 不在 polish 中途突袭重构。

# 来源 / 关联
- 来源: 用户提问"各维度数据展示对不同 agent 插件的兼容性如何, 是否需要兼容和扩展优化" → ground-truth 排查所得。
- 关联: `docs/works/2026-06-17-gh-138-overview-modular-dashboard`; adapter 真源
  `packages/berth-scan-engine/src/agent-plugins/adapter-registry.ts`; `agentSplit` 由
  `engine/activity-insights.ts buildActivityInsights` 产出。
- 关联 bug: `2026-06-18-BUG-session-row-mislabels-non-claude-codex-agents` (同属 agent identity 主题)。

# 更新 (2026-06-18, GH-138 — 首页维度 DONE)
- **首页已实现** (团队并行 + lead 集成): 泛化 `AgentView`→任意 agentId + 共享 `matchesAgentView`; 重加全局 `agentView` store 生产者; `AgentScopeSwitcher` (Overview 工具栏, 选项取未过滤在场 agent); `useDashboardInsights`/`useUsageSummary` 透传 ('all' 归一为不过滤)。CDP 实测全部 widget 按 agent 重过滤通过; typecheck/lint/1216 单测/24 e2e 绿。详见 resolved/2026-06-10-...-agent-view-store-vestige 的"重加执行"。
- **仍 OPEN**: (a) 把过滤推广到其它页面 (sessions/usage/instructions/capabilities) 实现真·全局; (b) 切换器是否上提侧栏全局 chrome; (c) provenance 透明 (agent 特定维度如 skill/mcp 在多 agent 在场时标注口径) — 已被"选 Codex→skill 0/MOST USED 空"自然体现, 但跨页一致性待做。
- 状态: 首页 (GH-138) DONE; 全应用全局推广 OPEN。
