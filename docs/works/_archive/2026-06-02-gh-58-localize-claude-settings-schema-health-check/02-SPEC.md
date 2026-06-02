# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

补充 `EXACT_TEXT_KEYS`:

- `Claude settings schema is not declared`
- `settings.json does not declare the Claude Code settings JSON schema.`
- `Add Claude settings schema`
- `Add the official Claude Code settings schema near the top of the JSON file.`

新增 i18n key:

- `healthChecks.text.titles.claudeSettingsSchemaMissing`
- `healthChecks.text.messages.claudeSettingsSchemaMissing`
- `healthChecks.text.fixLabels.addClaudeSettingsSchema`
- `healthChecks.text.fixDescriptions.addClaudeSettingsSchema`

## 模块结构 / 组件拆分

继续使用 `src/renderer/src/lib/health-check-i18n.ts` 作为健康检查展示文案映射入口。只改 i18n helper 和 en/zh locale。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 仅替换现有文案 | Overview 截图 |
| 组件选择 / 设计系统一致性 | 复用现有健康检查行 | renderer 测试 |
| 交互反馈 / 状态切换 | 不改变交互 | 现有测试回归 |
| loading / empty / error / disabled / focus | 不改变状态结构 | 现有测试回归 |
| 响应式 / 可访问性 / 键盘可达 | 不新增控件 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 中英文 locale 均有 key; 未知值 fallback 原值 | renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Overview Claude schema health check 本地化 | renderer | tests/renderer/overview-health-checks.test.tsx | pnpm vitest run tests/renderer/overview-health-checks.test.tsx |  |
| Hooks hover Claude schema health check 本地化 | renderer | tests/renderer/hooks-lifecycle-view.test.tsx | pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| i18n helper exact mapping | 1, 2, 3 |
| renderer tests | 4 |
