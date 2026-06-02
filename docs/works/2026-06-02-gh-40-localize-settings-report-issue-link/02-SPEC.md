# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不改数据契约和 IPC 契约。

新增 i18n key:

- `settings.reportIssue`

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

修改:

- `src/renderer/src/i18n/locales/en.json`: `settings.reportIssue = "Report Issue"`
- `src/renderer/src/i18n/locales/zh.json`: `settings.reportIssue = "报告问题"`
- `src/renderer/src/pages/settings.tsx`: 将硬编码 `Report Issue` 替换为 `{t('settings.reportIssue')}`

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 只替换按钮文本 | diff 和 renderer 测试 |
| 组件选择 / 设计系统一致性 | 保留现有按钮和 icon | 不改结构 |
| 交互反馈 / 状态切换 | 不改点击行为和 URL | renderer 测试可覆盖按钮存在 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改焦点顺序 | 不适用 |
| 文案 / i18n / 数字和路径格式 | 中英 locale 都有 key | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文设置页 issue 链接本地化 | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm exec vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| 英文设置页 issue 链接保持 | renderer | `tests/renderer/settings-page.test.tsx` | `pnpm exec vitest run tests/renderer/settings-page.test.tsx` | 不适用 |
| 本地门禁 | lint/typecheck/harness | 全仓 | `pnpm lint`; `pnpm typecheck`; `pnpm harness:check` | 不适用 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 新增 locale key 并替换硬编码 | 1, 2, 3 |
| 测试与门禁 | 4 |
