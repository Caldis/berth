# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- 复用 `UsageSummary.costSource` 和 `UsageSummary.totalCost`, 不修改 `src/shared/types/asset.ts` 或 IPC handler。(验收 1, 3, 5)
- `costSource === 'unknown'` 时金额仍显示 `—`, 但来源 badge 显示已有 i18n label `usage.costSource.unknown`。(验收 3, 4)
- 使用现有 `usage.costScopeNotice` 作为 Overview 费用来源提示文案, 保持 Usage / Overview 口径一致。(验收 2, 5)

## 模块结构 / 组件拆分

遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/renderer/src/pages/overview.tsx`
  - 引入并使用 `CostSourceBadge`。
  - 在费用卡 header 右侧增加一个紧凑的来源/金额区域。
  - 为来源区域提供 `title` 和 `aria-label`, 文案使用 `usage.costScopeNotice`。
- `src/renderer/src/components/shared/cost-source-badge.tsx`
  - 默认不改。若实现中发现需要 className 微调, 只通过传入 `className` 控制。
- `tests/renderer/overview-health-checks.test.tsx`
  - 增加 renderer 覆盖: zh 语言、有 known cost、unknown cost 两种情况。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 来源 badge 放在金额旁, 不增加新段落; 费用图表空间不变。 | 截图确认 header 不拥挤, 图表不下移。 |
| 组件选择 / 设计系统一致性 | 复用 `CostSourceBadge`, 沿用 Usage 页色彩语义。 | renderer 测试断言 badge 文案; 视觉确认颜色和 Usage 一致。 |
| 交互反馈 / 状态切换 | 不新增点击操作; hover/title 提供说明。 | DOM 断言 `title` / `aria-label` 包含 scope notice。 |
| loading / empty / error / disabled / focus | loading 仍由现有 hook 状态自然更新; empty dailyCosts 不影响 header badge; unknown 显示 `—`。 | renderer 测试覆盖 known/unknown。 |
| 响应式 / 可访问性 / 键盘可达 | header 右侧使用可换行或紧凑 flex, badge 不只靠颜色表达。 | 截图 + 测试断言中文 label, 不出现 raw enum。 |
| 文案 / i18n / 数字和路径格式 | 使用已有 `usage.costSource.*` 与 `usage.costScopeNotice`; 金额继续用 `formatCurrency`。 | zh 测试断言“混合/未知”和 scope notice。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Overview known cost 显示来源 badge 与说明 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` |  |
| Overview unknown cost 显示 `—` 与未知来源, 无 raw enum | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` |  |
| Usage 现有 tooltip/费用文案不受影响 | renderer | `tests/renderer/usage-tooltip-label.test.tsx` | `pnpm vitest run tests/renderer/usage-tooltip-label.test.tsx` |  |
| 类型和 harness 状态 | typecheck / harness | 不适用 | `pnpm typecheck:web`; `pnpm harness:check` |  |
| 界面截图 | manual | 不适用 | `pnpm dev:agent start --id gh59-overview-cost-source --debug-port <port>` 后截图 | 自动化难以判断视觉密度, 需要真实窗口截图。 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Overview 使用 `CostSourceBadge` | 1, 4 |
| 来源说明复用 `usage.costScopeNotice` | 2, 5 |
| unknown 状态仍显示 `—` 且有未知 badge | 3, 4 |
| 测试与截图验证 | 1, 2, 3, 4, 5 |
