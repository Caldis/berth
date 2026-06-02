# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
新增 i18n key:
- `overview.healthCheckActions.ignoreInfo`
- `overview.healthCheckActions.copyFixSnippet`
- `windowControls.minimize`
- `windowControls.maximize`
- `windowControls.restore`
- `windowControls.close`

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。
- `overview.tsx` 使用 `t(...)` 生成健康检查 action title。
- `window-controls.tsx` 引入 `useTranslation`, 使用 i18n 生成按钮 `aria-label`。
- `en.json` 保留原英文文案, `zh.json` 增加中文文案。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改布局和密度 | renderer 测试只断言 label, 不引入 DOM 结构变化 |
| 组件选择 / 设计系统一致性 | 继续使用现有 icon button | E2E 仍能通过窗口控制 |
| 交互反馈 / 状态切换 | 最大化后 label 从最大化切到还原, 原行为保持 | `window-controls.test.tsx` 覆盖 |
| loading / empty / error / disabled / focus | 不适用; 按钮无新增异步状态 | 不新增测试 |
| 响应式 / 可访问性 / 键盘可达 | `aria-label` 跟随语言, 保持按钮可被 label 查询 | renderer 测试覆盖中文 accessible name |
| 文案 / i18n / 数字和路径格式 | 所有新增文案进入 en/zh locale | i18n 测试和现有 E2E 覆盖 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Overview 健康检查按钮 title 中文化 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx` |  |
| WindowControls aria-label 中文化且英文保持 | renderer | `tests/renderer/window-controls.test.tsx` | `pnpm exec vitest run tests/renderer/window-controls.test.tsx` |  |
| 标准门禁 | lint/typecheck/test/harness/e2e | 多文件 | `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build`; `pnpm test:e2e` |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| i18n key 与组件调用 | 1, 2, 3 |
| 测试策略 | 1, 2, 3, 4 |
