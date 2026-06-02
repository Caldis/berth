# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 新增 `memory.importanceLabel.{core,active,archive,unknown}`。
- `ImportanceBadge` 使用 label key 展示短标签，`title` 继续使用 `memory.importanceHint`。
- `importanceOptions` 的 `label` 使用同一套 label key，`id` 保持原 enum。

## 模块结构 / 组件拆分
- 只改 `memory-view.tsx` 和 locale。
- 不新增组件，不改 Memory IPC 和 shared types。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持 badge/chip 位置，只替换短文案 | renderer test |
| 组件选择 / 设计系统一致性 | 继续使用现有 badge/chip | code review |
| 交互反馈 / 状态切换 | 筛选、清除筛选、展开 note 不变 | renderer test |
| loading / empty / error / disabled / focus | 不改状态模型 | 目标测试 |
| 响应式 / 可访问性 / 键盘可达 | button accessible name 使用可读 label | renderer test |
| 文案 / i18n / 数字和路径格式 | 英文/中文 label 补齐；hover hint 保留 | renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| badge 和 filter chip 显示可读 label | renderer | tests/renderer/memory-view.test.tsx | pnpm vitest run tests/renderer/memory-view.test.tsx |  |
| 中文 label | renderer | tests/renderer/memory-view.test.tsx | pnpm vitest run tests/renderer/memory-view.test.tsx |  |
| 类型检查 | typecheck | n/a | pnpm typecheck:web |  |
| harness 任务结构 | harness | n/a | pnpm harness:check --work docs/works/2026-06-02-gh-61-memory-readable-importance-labels |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| importanceLabel i18n | 1, 2, 3 |
| hover hint 保留 | 4 |
