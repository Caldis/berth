# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增健康检查元信息展示 helper:

- `localizeHealthCheckScope(scope, t)`: 优先读取 `common.scope.${scope}`, 找不到则返回原值。
- `localizeHealthCheckConfidence(confidence, t)`: 读取 `healthChecks.text.confidence.${confidence}`, 找不到则返回原值。
- `localizeHealthCheckAssetType(assetType, t)`: 读取 `healthChecks.text.assetTypes.${assetType}`, 找不到则返回原值。

helper 仅用于 UI 标签显示, 不修改 `HealthCheck` 原始对象, 原始 JSON / path / source 仍保持真实数据。

## 模块结构 / 组件拆分

在 `src/renderer/src/lib/health-check-i18n.ts` 扩展 helper, 继续作为健康检查展示文案的单一入口。

接入点:

- `src/renderer/src/pages/overview.tsx`: scope / confidence / asset type tag 使用 helper。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`: Hook health hover row scope tag 使用 helper。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 仅替换 tag 文案, 不新增平铺说明块 | 浏览器实测 Overview 与 Hooks |
| 组件选择 / 设计系统一致性 | 复用现有 tag / badge 样式 | renderer 测试与截图 |
| 交互反馈 / 状态切换 | hover 详情仍由现有组件触发 | Hooks hover 测试 |
| loading / empty / error / disabled / focus | 不改变状态结构 | 现有测试回归 |
| 响应式 / 可访问性 / 键盘可达 | 文案长度控制在 tag 可承载范围 | 截图检查 |
| 文案 / i18n / 数字和路径格式 | scope / confidence / asset type 走 i18n helper, 未知值 fallback 原值 | renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Overview 健康检查元信息 tag 本地化 | renderer | tests/renderer/overview-health-checks.test.tsx | pnpm vitest run tests/renderer/overview-health-checks.test.tsx |  |
| Hooks 生命周期 hover scope 本地化 | renderer | tests/renderer/hooks-lifecycle-view.test.tsx | pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx |  |
| harness 任务结构 | harness | docs/works/2026-06-02-gh-57-localize-health-check-metadata-tags | pnpm harness:check --work docs/works/2026-06-02-gh-57-localize-health-check-metadata-tags |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 本地化健康检查元信息 helper | 1, 2, 3 |
| Overview 与 Hooks 测试 | 4 |
| 界面截图检查 | 1, 2 |
