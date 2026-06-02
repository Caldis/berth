# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增 locale key:

- `overview.stats.skills`
- `overview.stats.plugins`
- `overview.healthCount.error`
- `overview.healthCount.warning`
- `overview.healthCount.info`

计数 key 接收 `count`。

## 模块结构 / 组件拆分

只改 `Overview` 页面。`statCards` 的 label 改为 `t(...)`; 健康检查分组计数改为 `t('overview.healthCount.*', { count })`。不新增组件。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 只换文案来源, 不新增节点 | renderer 测试 |
| 组件选择 / 设计系统一致性 | 继续使用现有 StatCard 和分组 header | 代码审查 |
| 交互反馈 / 状态切换 | 不改健康检查操作 | 既有测试 |
| loading / empty / error / disabled / focus | 不改状态分支 | 既有测试 |
| 响应式 / 可访问性 / 键盘可达 | 文案长度仍在小标签内 | renderer 测试 + 代码审查 |
| 文案 / i18n / 数字和路径格式 | 使用 locale key 和 count 插值 | 中文测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文 Overview stat 与健康计数 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx` |  |
| 收口检查 | typecheck / harness |  | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-48-localize-overview-labels` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Overview locale key | 1, 2, 3 |
| renderer 测试 | 1, 2, 4 |
