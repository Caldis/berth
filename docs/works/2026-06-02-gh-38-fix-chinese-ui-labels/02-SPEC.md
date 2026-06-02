# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改数据契约、IPC 契约和 Agent Capability Plugin 结构。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

修改 `src/renderer/src/i18n/locales/zh.json`:

- `settings.agentPlugins`: 改为中文短标题, 建议 `Agent 能力插件`。
- `assetGuide.evidence.providers`: 改为 `个提供方`。
- `assetGuide.evidenceHelp.providers`: 将说明中的 `provider` 改为中文语义, 保留 Claude Code / Codex 等专名。
- 如同一段附近还有面向用户的 `Provider` 标签, 一并改为 `提供方`。

不修改 `en.json`。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 只替换短文案, 不增加 UI 元素 | 截图或 renderer 测试确认文本 |
| 组件选择 / 设计系统一致性 | 复用现有标题和 tag 样式 | 不改组件结构 |
| 交互反馈 / 状态切换 | 不改交互 | 不适用 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改布局和焦点顺序 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 中文 locale 下不暴露未翻译 `provider` / `Agent Capability Plugins` | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文设置标题 | renderer | `tests/renderer/settings-agent-plugins.test.tsx` | `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx` | 不适用 |
| 中文 evidence provider 标签 | renderer | `tests/renderer/feature-guide-panel.test.tsx` | `pnpm exec vitest run tests/renderer/feature-guide-panel.test.tsx` | 不适用 |
| 本地门禁 | lint/typecheck/harness | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm harness:check` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中文 locale 文案修复 | 1, 2 |
| 英文 locale 保持 | 3 |
| 测试与门禁 | 4 |
