# 描述
- `stores/app.ts` 的全局 `agentView` 状态 ('all' | 'claude' | 'codex') 只有消费者没有生产者: `setAgentView` 在整个 renderer 无任何调用点, 全局 agent 切换器已在历史导航重构中移除, 7 处消费点 (sessions/overview/usage/instructions/capabilities/memory-view/use-ipc) 恒收 'all'。

# 证据
- `grep -rn "setAgentView(" src/renderer/src` → 0 命中 (仅 store 定义)。
- 消费点: `src/renderer/src/pages/{sessions,overview,usage,instructions,capabilities}.tsx`、`components/memory/memory-view.tsx`、`hooks/use-ipc.ts`。
- IPC 契约 (`sessions:list` 等) 与下游过滤逻辑仍按 agentView 参数实现并测试, 属可用但不可达的功能面。

# 预期 · 建议
- 二选一: (a) 恢复全局 agent 视图切换器 (导航或设置入口), 让 7 处消费点重新可达; (b) 判定多 agent 视图切换不再是产品方向, 移除 store 字段与各消费点的 agentView 透传, 收敛 IPC 契约。
- 决策影响 GH-114 (agent-teams 运行时视图) 的"Codex 视角隐藏入口"验收口径: 当前只能页面级标注, 恢复切换器后可升级为导航级条件显示。

# 来源 · 关联
- GH-114 explore (2026-06-10) 旁支发现。关联 docs/works/_archive/2026-06-10-gh-114-agent-teams-runtime-view/、docs/works/_archive/2026-06-03-gh-90-nav-header-ux-redesign/ (切换器疑似在该轮重构中移除)。

# 终态 (2026-06-11, RESOLVED — 用户拍板: 计划中功能, 当前残迹先删, 后续重加)
- **删除的死生产者管道** (值恒 'all', 行为零变化): store `agentView`/`setAgentView`; 6 个页面/视图的 store 读取与透传 (sessions/overview/usage/instructions/capabilities/memory-view); PageChromeGuide.agentView 字段与 top-navigation 透传; sessions 行 `agentView==='all'` 条件 (chip 恒显); overview 标签定为 `t('agentView.all')`; usage 请求不再带 agentView; `lib/agent-view.ts` 整文件孤儿删除 (matchesAgentView/filterAssetsByAgentView/computeStatsForAssets 零调用方) 连带保活测试。
- **保留的 view 机制 (后续重加切换器的地基)**: HooksLifecycleView / StatusLineSection / FeatureGuidePanel 的 `agentView` props (页面传 "all" 字面量); `lib/hook-lifecycle` 按 agent 分组逻辑; guidance items 的 claude/codex 变体; IPC `sessions:list`/`usage:summary` 的可选 agentView 参数与 main 侧过滤 (重加时只需恢复生产者)。
- 验证: typecheck/lint 绿, 全量 942 测试绿 (7 个测试文件契约更新 + 1 孤儿测试删除), 真机冒烟 — overview「当前 Agent」pill 正常、sessions 行 agent chip 恒显 (31 行中 30 行)、hooks 生命周期页正常渲染无 raw key。
- 重加路线: 恢复切换器 UI (导航/设置) → 写 store/参数生产者 → 机制层即刻生效。

# 重加执行 (2026-06-18, GH-138 — 用户 /goal 拍板"开搞")
- 按上述重加路线落地 (首页 scope): 泛化 `AgentView` 支持任意 agentId + 共享 `matchesAgentView` (引擎/渲染真源) → 重加 store `agentView`/`setAgentView` 生产者 → `useDashboardInsights` 透传 + provider 注入 → `AgentScopeSwitcher` 切换器落在 Overview 工具栏 (非侧栏 footer), 选项数据驱动自未过滤的在场 agent。
- 实测 (CDP): All↔Codex 往返, 全部 widget 按 agent 重过滤 (Codex 770 会话 / 6.19B / skill 0)。typecheck/lint/1216 单测/24 e2e 全绿。
- 仍 OPEN (本轮未做, 见 `2026-06-18-IMPROVEMENT-dashboard-agent-aware-filtering`): 把过滤推广到 sessions/usage/instructions/capabilities 等其它页面 (真·全局), 及切换器是否上提到侧栏全局 chrome。
- 状态: 首页维度 RESOLVED; 全应用全局推广 OPEN。
