# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

本任务不改 IPC 或持久化数据。新增组件本地状态:

- `activeStageId: string | null`
- 当 `groups` 变化且 active id 不存在时, 重置为 `groups[0]?.id ?? null`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `HooksLifecycleView`: 增加 active stage state, 在 `scrollToStage` 中同步状态。
- 侧边栏阶段按钮:
  - `aria-current={isActive ? 'true' : undefined}`
  - 选中样式使用 `bg-accent text-foreground shadow-sm` 一类现有 token。
- `tests/renderer/hooks-lifecycle-view.test.tsx`: 增加或扩展 sidebar 测试。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增说明块, 只改阶段按钮状态 | renderer 测试 + 代码检查 |
| 组件选择 / 设计系统一致性 | 继续使用原生 button 和现有 token | renderer 测试 |
| 交互反馈 / 状态切换 | 点击后设置当前项并滚动 | renderer 测试 |
| loading / empty / error / disabled / focus | 不改变现有 loading/empty/error; focus 仍用 button 默认路径 | renderer 测试 |
| 响应式 / 可访问性 / 键盘可达 | `aria-current` 暴露当前项; 移动端横向列表不变 | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 不新增文案 | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 当前阶段 `aria-current` 和点击状态 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 任务产物合规 | harness | 不适用 | `pnpm harness:check --work docs/works/2026-06-02-gh-64-hooks-lifecycle-current-stage-semantics` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 初始第一个阶段 current | 1 |
| 点击更新 current | 2 |
| 点击仍滚动 | 3 |
| 选中样式 | 4 |
| renderer 测试 | 5 |
