# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

- 不修改 `UsageSummary`、`CostSource` 或 IPC。
- 新增 i18n key:
  - `usage.costSourceDescription.actual`
  - `usage.costSourceDescription.estimated`
  - `usage.costSourceDescription.mixed`
  - `usage.costSourceDescription.unknown`
- `CostSourceBadge` 内部根据 `source` 读取 label 与 description, 并组合:
  - 可见文本: label
  - `title`: description
  - `aria-label`: `${label}: ${description}`

## 模块结构 / 组件拆分

遵守 docs/ARCHITECTURE.md 的渲染层边界:

- `src/renderer/src/components/shared/cost-source-badge.tsx`
  - 增加 `description`、`aria-label`、`title`。
  - 不增加 props, 让所有使用方自动获得说明。
- `src/renderer/src/i18n/locales/en.json`
  - 增加英文说明。
- `src/renderer/src/i18n/locales/zh.json`
  - 增加中文说明。
- `src/renderer/src/pages/overview.tsx`
  - 移除围绕费用来源 tag 的重复 `title` / `aria-label`, 保留页面自身布局。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | tag 仍只显示短标签, 不新增平铺说明块 | Overview / Usage 截图确认费用卡不变宽、不换行 |
| 组件选择 / 设计系统一致性 | 复用现有 shared badge, 不引入新浮层组件 | 代码检查和 renderer 测试 |
| 交互反馈 / 状态切换 | hover 走原生 `title`; 读屏走 `aria-label` | renderer 测试断言 `title` 和 accessible label |
| loading / empty / error / disabled / focus | 不改变数据加载状态; unknown 来源仍显示未知和破折号金额 | 现有 unknown 测试继续覆盖 |
| 响应式 / 可访问性 / 键盘可达 | 说明不进入布局; `aria-label` 包含短标签与说明 | 测试用 `getByLabelText` 覆盖 |
| 文案 / i18n / 数字和路径格式 | 中英文说明均用用户能理解的成本来源文案, 不出现 raw enum | i18n 文案测试和 queryByText raw enum |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| CostSourceBadge 为四种来源提供 title 和 aria-label | renderer | `tests/renderer/cost-source-badge.test.tsx` | `pnpm vitest run tests/renderer/cost-source-badge.test.tsx` | 不适用 |
| Overview 使用共享 badge 说明, 不暴露 raw enum | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` | 不适用 |
| Usage 自动获得共享 badge 说明 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm vitest run tests/renderer/sessions-pages.test.tsx` | 不适用 |
| 类型与任务态 | typecheck / harness | 不适用 | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-72-cost-source-badge-details` | 不适用 |
| 实际界面 hover/布局 | manual UI | 截图记录到 03-PLAN | dev 实例 + Playwright 截图 | hover title 属浏览器原生浮层, 自动截图不稳定; 以 DOM 属性和截图布局验证替代 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| i18n descriptions + badge title | 1, 2 |
| shared badge 内聚实现 | 3 |
| badge aria-label | 4 |
| 不新增说明块, 截图验证布局 | 5 |
