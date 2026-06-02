# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

无数据契约变化。

## 模块结构 / 组件拆分

只修改 `tests/renderer/sessions-pages.test.tsx`:

- 保留点击 `Copy override JSON` 后检查 `writeText` 入参的断言。
- 将同步 `getByRole('button', { name: 'Copied' })` 改为异步等待 UI 状态, 使用 `screen.findByRole` 或 `waitFor` 包住按钮查询。

不修改 `src/renderer/src/pages/usage.tsx`, 因为产品行为没有错误。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不修改 UI | 不适用 |
| 组件选择 / 设计系统一致性 | 不修改 UI | 不适用 |
| 交互反馈 / 状态切换 | 测试等待现有复制反馈状态 | renderer 测试 |
| loading / empty / error / disabled / focus | 不修改 UI | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 保持按钮 accessible name 断言 | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 不改文案 | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 复制反馈测试等待 UI 状态 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx` |  |
| CI 红灯修复总验收 | unit/renderer/harness | 全量 | `pnpm test`; `pnpm harness:check`; GitHub Actions run |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 异步等待 `Copied` 按钮 | 1, 2 |
| 不修改产品 UI | 2 |
| 本地和远端验证 | 3 |
