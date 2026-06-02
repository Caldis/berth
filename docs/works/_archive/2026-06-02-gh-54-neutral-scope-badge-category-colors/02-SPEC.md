# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不改数据契约。`ScopeBadge` 仍接收 `AssetScope` 与可选 `className`。

## 模块结构 / 组件拆分

- 修改 `src/renderer/src/components/shared/scope-badge.tsx`。
- 扩展 `tests/renderer/scope-badge-palette.test.tsx`。
- 不改各页面消费者。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 所有 scope 使用同一套低对比中性 pill, 降低分类色噪声 | renderer 测试 + diff 核对 |
| 组件选择 / 设计系统一致性 | 继续使用 shared `ScopeBadge`, 不新增局部颜色表 | renderer 测试 |
| 交互反馈 / 状态切换 | ScopeBadge 无交互, 不改状态切换 | 不适用 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 结构; 文本仍是可读标签 | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 继续使用 `common.scope.*` | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| shared ScopeBadge 所有 scope 使用中性色且无蓝/绿/紫/橙 class | renderer | `tests/renderer/scope-badge-palette.test.tsx` | `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx` |  |
| 全局检查 | lint/typecheck/test/harness | 现有测试 | `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中性 ScopeBadge palette | 1, 2, 4 |
| 不改消费者结构 | 3 |
| 全局检查与 CI | 5 |
