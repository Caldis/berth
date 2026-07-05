# IMPROVEMENT: 侧栏全局筛选器 (项目范围 / agentView) 是否跨重启持久化

状态: OPEN (低优, 需产品决策)

## 背景
侧栏两个全局筛选器 (ProjectScopeSwitcher / AgentScopeSwitcher) 的选择均为纯内存态:
- `scopeSelection` (zustand, 默认 `global`) — 经 IPC 通知引擎但引擎侧同为内存字段, 不落盘;
- `agentView` (zustand, 默认 `all`) — 纯渲染层过滤。

应用重启后一律回落 `Global / All agents`。2026-07-05 侧栏筛选器 UIUX 收敛专项 (ScopePopover 外壳) 中确认这是**刻意保留的现状**, 未随手加持久化:

- 支持持久化: 用户主要在单一项目工作时, 每次启动都要重新选 scope;
- 支持回落默认: `Global = 完整结果` 是本产品的安全默认 ("看不到=没有" 心智); 重启恢复到被过滤视图, 若用户忘记上次选择, 会误以为资产丢失。本次专项已给过滤生效态加 trigger 指示点, 一定程度缓解, 但重启即回全量仍是更保守的选择。
- 折中方案参考: 持久化 `agentView` (维度可见性强、误导性低) 而不持久化 `scopeSelection`; 或恢复时在侧栏顶部给一次性提示。

另: 持久化 `scopeSelection.mode==='project'` 需要启动时走 `projectScope.activate` 重扫路径, 有启动性能与项目已删除的降级处理成本。

## 建议
产品定夺是否持久化及范围; 若做, 渲染层入口在 `stores/app.ts` (zustand persist partialize) + 启动时 scope 重放, 工程量小, 主要是产品语义决策。

## 来源
2026-07-05 侧栏项目/agent 筛选器 UIUX 优化专项, 按 EVOLUATION 规则交叉引用记录, 不混入本批实现。
