# 描述
- session-detail.tsx 1593 行内联 ~200 行无 React 依赖纯函数 (buildSessionSignals/格式器群/duration 过滤/工具分类), 只能经渲染间接测; capabilities.tsx 1054 行的 statusLine 整套视图模型与 redactStatusLineCommand 凭证脱敏正则留在页面 (GH-115 T0 已为后者补枚举测试网并加 export); filterAssetsByAppScope(filterAssetsByAgentView(...)) 管道与 scanning||idle 空态判定在 capabilities/instructions 逐字重复。

# 预期 · 建议
- 纯逻辑迁 lib/session-signals.ts + lib/status-line.ts 配直测; statusLine 块迁 components/capabilities/ 与 hooks section 模式对齐; 建 hooks/use-visible-assets.ts 收敛过滤管道 + 一条语义锁测试。
- **前置**: 两页是多 verify 任务足迹热点, 待收口后做。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R16)。关联 2026-06-10-IMPROVEMENT-expandable-asset-card-convergence.md (同窗口)。
- 状态: OPEN。
