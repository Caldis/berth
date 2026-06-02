# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改数据契约。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

修改 `src/renderer/src/i18n/locales/zh.json`:

- `agentView.all`: `All` -> `全部`

补充 `tests/renderer/sidebar-agent-view.test.tsx`:

- 英文默认仍可通过 `Agent view` label 修改选项。
- 中文语言下, selector 的 `all` option 文本为 `全部`, 且不出现 `All`。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改布局 | diff |
| 组件选择 / 设计系统一致性 | 保留原生 select | renderer 测试 |
| 交互反馈 / 状态切换 | 不改 `setAgentView` 行为 | 现有测试 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改 aria 和键盘行为 | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 中文 all option 本地化 | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文 all option | renderer | `tests/renderer/sidebar-agent-view.test.tsx` | `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx` | 不适用 |
| 本地门禁 | lint/typecheck/harness | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm harness:check` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中文 locale 修复 | 1 |
| 英文和行为保持 | 2, 3 |
| 测试与门禁 | 4 |
