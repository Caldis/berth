# 需求分析 (Explore 产物)

## 现状理解
- `src/renderer/src/pages/overview.tsx` 通过 `useUsageSummary(7, agentView)` 读取 `UsageSummary`, 当前只在费用卡右上角显示 `formatCurrency(totalCost)` 或 `—`。
- `UsageSummary` 已在 `src/shared/types/asset.ts` 声明 `costSource: 'actual' | 'estimated' | 'mixed' | 'unknown'`, 并带 `actualCost` / `estimatedCost` / `costDelta` / `costExplanation`。本任务不改 IPC 契约。
- `src/renderer/src/pages/usage.tsx` 已使用 `CostSourceBadge` 和 `usage.costScopeNotice` 解释“真实 / 估算 / 混合”费用来源, 是本任务可复用的现有模式。
- `src/renderer/src/components/shared/cost-source-badge.tsx` 只负责短标签, 无 tooltip/title; 当前可直接在 Overview 卡片中使用, 说明文本由 Overview 容器提供。

## 关联与依赖
- 数据链路: renderer `Overview` -> `useUsageSummary` -> preload IPC -> main usage summary。当前数据已有 `costSource`, 因此修复只涉及 renderer 展示。
- 共享 UI: Usage 页已经用 `CostSourceBadge` 展示同一枚举, 本任务优先复用, 避免 Overview 发明另一套颜色/文案。
- i18n: `en.json` / `zh.json` 已有 `usage.costSource.*` 和 `usage.costScopeNotice`; 如需要更短的 Overview tooltip, 只增加 `overview.*` 文案。
- 外部资料: 本任务不改变供应商费用口径或价格表算法, 只展示本地已有数据来源; 不需要查外部官方文档。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Overview 费用卡在有 usage 数据时显示 `CostSourceBadge`, 用户能直接看到真实 / 估算 / 混合 / 未知来源。
2. Overview 费用卡提供短提示, 明确本地扫描和价格表估算可能不同于供应商账单。
3. 未知费用来源时仍显示 `—`, 但 badge/提示能说明来源未知, 不误导为真实费用。
4. 中文界面不出现 raw `actual` / `estimated` / `mixed` / `unknown` 枚举。
5. 变更不影响 Usage 页已有费用说明和 token/health check 展示。

## 界面质量与交互验收
- 现有结构: Overview 中部是两列卡片, 左侧最近会话, 右侧近 7 天费用柱状图。费用卡 header 左侧标题, 右侧总额, 当前总额视觉权重大但来源缺失。
- 设计系统: 使用现有 `rounded-xl border bg-card`, Recharts 图表, `CostSourceBadge` 的颜色语义。
- 信息密度: 不新增长段说明; 在 header 中靠近金额放短 badge, 通过 `title` / `aria-label` 提供解释, 保持卡片紧凑。
- 用户路径: 用户从 Overview 快速扫费用趋势时, 应能不进入 Usage 页就知道这个金额属于真实、估算、混合或未知。
- 状态: 覆盖有数据、空 dailyCosts、unknown costSource。loading 仍沿用当前 Overview 行为。
- 可访问性: badge/解释需要可被测试读取, 不只依赖颜色; tooltip/title 文案应与中文界面一致。
- 响应式: header 需要 `flex-wrap` 或等价处理, 避免小宽度下金额、badge 和标题重叠。

## 未决问题
- 无。采用现有 Usage 页口径和样式, 不改变费用算法。
