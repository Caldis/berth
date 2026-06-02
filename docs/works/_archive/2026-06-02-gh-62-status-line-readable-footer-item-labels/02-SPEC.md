# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
- 新增 `capabilities.statusLine.itemLabels.model-with-reasoning`。
- 新增 `capabilities.statusLine.itemLabels.current-dir`。
- 组件使用 `t(..., { defaultValue: item })`，无翻译或未知项时回退 raw。
- 已知项 chip `title` 使用 raw item id。

## 模块结构 / 组件拆分
- 在 `capabilities.tsx` 内增加 `formatCodexStatusLineItemLabel` helper。
- `StatusLineCard` 和 `CodexDefaultStatusLine` 共用该 helper。
- 不改 parser 和 shared types。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 保持 chip 位置和尺寸 | renderer test |
| 组件选择 / 设计系统一致性 | 继续使用现有 chip | code review |
| 交互反馈 / 状态切换 | hover title 提供 raw id；未知项 warning 不变 | renderer test |
| loading / empty / error / disabled / focus | 不改状态模型 | 目标测试 |
| 响应式 / 可访问性 / 键盘可达 | 可读 label 降低横向长度 | renderer test |
| 文案 / i18n / 数字和路径格式 | 英文/中文 label；unknown raw 保留 | renderer test |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| status line card 使用可读 item label | renderer | tests/renderer/status-line-section.test.tsx | pnpm vitest run tests/renderer/status-line-section.test.tsx |  |
| default footer 使用可读 item label | renderer | tests/renderer/status-line-section.test.tsx | pnpm vitest run tests/renderer/status-line-section.test.tsx |  |
| typecheck | typecheck | n/a | pnpm typecheck:web |  |
| harness 任务结构 | harness | n/a | pnpm harness:check --work docs/works/2026-06-02-gh-62-status-line-readable-footer-item-labels |  |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| itemLabels + title | 1, 2 |
| unknown fallback | 3 |
| zh copy | 4 |
