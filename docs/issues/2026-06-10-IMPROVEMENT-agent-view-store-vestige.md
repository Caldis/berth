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
- GH-114 explore (2026-06-10) 旁支发现。关联 docs/works/2026-06-10-gh-114-agent-teams-runtime-view/、docs/works/2026-06-03-gh-90-nav-header-ux-redesign/ (切换器疑似在该轮重构中移除)。
- 状态: OPEN。
