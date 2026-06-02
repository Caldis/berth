# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不涉及数据契约、IPC 或持久化。

## 模块结构 / 组件拆分

- `src/renderer/src/components/shared/scope-badge.tsx`
  - 将 `session` class 改为 `bg-zinc-500/10 text-zinc-700 dark:text-zinc-300`。
- `src/renderer/src/pages/instructions.tsx`
  - 删除本地 `ScopeBadge`。
  - 引入 shared `ScopeBadge`, 在使用处传 `className="rounded-full px-2 font-semibold"` 保持原显示风格。
- `tests/renderer/scope-badge-palette.test.tsx`
  - 渲染 shared `ScopeBadge` 验证 session badge 不含 orange 且含中性色。
  - 读取 Instructions 源码验证没有本地 orange scope 色。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改布局 | renderer 测试 + 代码 diff |
| 组件选择 / 设计系统一致性 | Instructions 复用 shared `ScopeBadge` | renderer 测试 |
| 交互反馈 / 状态切换 | badge 无交互 | 不适用 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 交互角色 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 保持 `common.scope.session` | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| session scope badge 不再使用 orange | renderer | `tests/renderer/scope-badge-palette.test.tsx` | `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx` |  |
| Instructions 不再重复 orange scope 色 | renderer | `tests/renderer/scope-badge-palette.test.tsx` | `pnpm exec vitest run tests/renderer/scope-badge-palette.test.tsx` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中性 session badge | 1 |
| Instructions 复用 shared 组件 | 2 |
| 不改 warning 色 | 3 |
| 检查通过 | 4 |
