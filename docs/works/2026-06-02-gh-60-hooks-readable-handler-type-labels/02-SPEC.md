# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- `HookDisplayDetails` 增加 `typeLabelKey?: string`。
- handler descriptor 存在时，`typeLabelKey` 使用 `handlerDescriptor.labelKey`。
- handler descriptor 不存在时，`typeLabelKey` 为空，UI 回退到 `display.type`。

## 模块结构 / 组件拆分
- 只改 `HooksLifecycleView` 内部展示逻辑。
- 不新增组件，不改 shared types。
- i18n 增加 `settings.agentPluginHookHandlers.*` 中内置 handler label/description key。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持现有 badge 位置，只替换展示文本 | renderer test |
| 组件选择 / 设计系统一致性 | 继续使用现有小 badge，不引入新控件 | code review |
| 交互反馈 / 状态切换 | 不改变展开 JSON、复制 JSON、启用禁用按钮 | renderer test |
| loading / empty / error / disabled / focus | 不改状态模型 | 目标测试回归 |
| 响应式 / 可访问性 / 键盘可达 | 文案更短，降低窄宽度换行风险 | renderer test |
| 文案 / i18n / 数字和路径格式 | handler label 走 i18n；JSON 原文不翻译 | renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 内置 handler 显示可读 label 且 JSON 保留原始 type | renderer | tests/renderer/hooks-lifecycle-view.test.tsx | pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx |  |
| 插件自定义 handler 显示 schema label | renderer | tests/renderer/hooks-lifecycle-view.test.tsx | pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx |  |
| 类型检查 | typecheck | n/a | pnpm typecheck:web |  |
| harness 任务结构 | harness | n/a | pnpm harness:check --work docs/works/2026-06-02-gh-60-hooks-readable-handler-type-labels |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| type label key | 1, 2, 4 |
| JSON 原文保留 | 3 |
