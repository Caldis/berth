# PRD 快照 (只读)

> 原始来源的快照。任何阶段不回写。

来源:
- docs/issues/2026-06-10-IMPROVEMENT-renderer-god-pages-logic-sink.md
- GitHub Issue: https://github.com/Caldis/berth/issues/144

## 正文 (来源 issue 快照)

### 描述
- session-detail.tsx 1593 行内联 ~200 行无 React 依赖纯函数 (buildSessionSignals/格式器群/duration 过滤/工具分类), 只能经渲染间接测; capabilities.tsx 1054 行的 statusLine 整套视图模型与 redactStatusLineCommand 凭证脱敏正则留在页面 (GH-115 T0 已为后者补枚举测试网并加 export); filterAssetsByAppScope(filterAssetsByAgentView(...)) 管道与 scanning||idle 空态判定在 capabilities/instructions 逐字重复。

### 预期 · 建议
- 纯逻辑迁 lib/session-signals.ts + lib/status-line.ts 配直测; statusLine 块迁 components/capabilities/ 与 hooks section 模式对齐; 建 hooks/use-visible-assets.ts 收敛过滤管道 + 一条语义锁测试。
- **前置已解除 (2026-06-11, 5.2 收敛核实)**: docs/works/ 全部归档、无在途任务。注意 session-detail.tsx 已经 GH-116 重设计 (重放视图替换 timeline, 删 ToolTimeline ~350 行), 行数与内联纯函数清单需以当前代码为准重新盘点后再动。

### 来源 · 关联
- GH-115 架构全面分析 (2026-06-10), 完整证据见 `docs/works/2026-06-10-gh-115-architecture-refactor/01-ANALYSIS.md` (R16)。关联 2026-06-10-IMPROVEMENT-expandable-asset-card-convergence.md (同窗口)。
- 状态: OPEN。

## 2026-06-19 核实 (续做)
- 当前行数: session-detail.tsx 1311 (GH-116 重设计后, 非原 1593) / capabilities.tsx 1054。explore 需以当前代码重新盘点内联纯函数清单。
