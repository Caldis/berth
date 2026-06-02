# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

无数据契约变化。

## 模块结构 / 组件拆分

修改 `src/renderer/src/pages/usage.tsx`:

- 新增 `usage.cost` locale key: 英文 `Cost`, 中文 `费用`。
- 将 Recharts `Tooltip` formatter 的第二个返回值从 `'Cost'` 改为 `t('usage.cost')`。
- 保持金额格式不变。

修改 `tests/renderer/sessions-pages.test.tsx`:

- 增加或扩展中文 Usage 页面测试, 使该页面在中文环境下能断言成本相关文案来自 locale。
- 若测试环境无法触发 Recharts tooltip, 至少覆盖中文 Usage 页面主要成本文案, 并由源码改动移除硬编码 `Cost`。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不修改布局 | 不适用 |
| 组件选择 / 设计系统一致性 | 保持现有 Recharts Tooltip | renderer 测试 |
| 交互反馈 / 状态切换 | Hover tooltip 的 series label 使用 locale | 代码检查 + 测试 |
| loading / empty / error / disabled / focus | 不修改 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不修改 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 使用 `usage.cost` | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Usage 中文成本文案 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx` |  |
| 收口检查 | unit/renderer/harness | 全量 | `pnpm test`; `pnpm harness:check`; GitHub Actions run |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Tooltip formatter 使用 `t('usage.cost')` | 1 |
| 中文 Usage 测试 | 2 |
| 本地与远端验证 | 3 |
