# 描述
- session-detail.tsx 1593 行内联 ~200 行无 React 依赖纯函数 (buildSessionSignals/格式器群/duration 过滤/工具分类), 只能经渲染间接测; capabilities.tsx 1054 行的 statusLine 整套视图模型与 redactStatusLineCommand 凭证脱敏正则留在页面 (GH-115 T0 已为后者补枚举测试网并加 export); filterAssetsByAppScope(filterAssetsByAgentView(...)) 管道与 scanning||idle 空态判定在 capabilities/instructions 逐字重复。

# 预期 · 建议
- 纯逻辑迁 lib/session-signals.ts + lib/status-line.ts 配直测; statusLine 块迁 components/capabilities/ 与 hooks section 模式对齐; 建 hooks/use-visible-assets.ts 收敛过滤管道 + 一条语义锁测试。
- **前置**: 两页是多 verify 任务足迹热点, 待收口后做。
- **前置已解除 (2026-06-11, 5.2 收敛核实)**: docs/works/ 全部归档、无在途任务。注意 session-detail.tsx 已经 GH-116 重设计 (重放视图替换 timeline, 删 ToolTimeline ~350 行), 行数与内联纯函数清单需以当前代码为准重新盘点后再动。

# 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R16)。关联 2026-06-10-IMPROVEMENT-expandable-asset-card-convergence.md (同窗口)。
- 状态: RESOLVED (核心由 GH-144 兑现, 2026-06-19)。

# 解决 (2026-06-19, GH-144)
- 核心兑现 (`docs/works/_archive/2026-06-19-gh-144-god-pages-logic-sink`): session-detail/capabilities
  核心纯逻辑下沉到 3 个 lib + 31 直测 (此前核心聚合器/诊断零直测, 仅组件间接覆盖):
  - `lib/session-signals.ts`: buildSessionSignals + getToolDurationMs + countSignalHighlights (13 直测)。
  - `lib/status-line-models.ts`: buildStatusLineViewModels + getStatusLineDiagnostics + getWorstDiagnosticLevel
    + group/rank/scriptRef/redact + 类型 (14 直测)。
  - `lib/runtime-state.ts`: shouldShowScanningState 去重 capabilities/instructions 逐字相同空态判定 (4 直测)。
  - 行为不变 (现有 status-line-section 8 / redaction 5 / sessions-pages + 全量 1279 不破)。
  - 关联 commit: 57fb8ee1 / 94daa23e / 0b38dda1。
- 剩余 (低优可选未来, 不阻塞): formatters 提取 (session-detail 格式器群 6 + 日期 3); asStringArray 统一
  (页面宽松 → lib 严格, 行为变更需回归); i18n formatters / sessionTabMeta / pluginComponentLabel 保留内联。
- 收敛: 核心已兑现, 移入 resolved/。
