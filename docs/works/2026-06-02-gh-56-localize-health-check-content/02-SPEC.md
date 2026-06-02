# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

- 不改 `HealthCheck` IPC 契约。
- 新增 renderer helper, 接收 `HealthCheck` 与 i18n `t`, 返回仅用于 UI 显示的本地化副本。
- helper 对已知英文文本做 key 映射和少量模式匹配; 未匹配文本返回原文。

## 模块结构 / 组件拆分

- 新增 `src/renderer/src/lib/health-check-i18n.ts`:
  - `localizeHealthCheck(check, t)`
  - 翻译字段: `title`, `message`, `suggestion`, `fix.label`, `fix.description`, `evidence[].label`
- `overview.tsx` 渲染每个 check 时使用本地化副本。
- `hooks-lifecycle-view.tsx` 的 hover 详情使用同一 helper。
- `en.json` / `zh.json` 新增健康检查文本键。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改结构, 只替换显示文案 | renderer 测试 + 截图 |
| 组件选择 / 设计系统一致性 | 沿用现有健康检查列表和 hover tip | renderer 测试 |
| 交互反馈 / 状态切换 | 点击、hover、复制、忽略逻辑不变 | 现有测试继续覆盖 |
| loading / empty / error / disabled / focus | 不改状态逻辑 | 现有测试继续覆盖 |
| 响应式 / 可访问性 / 键盘可达 | 不改 aria/title 外的结构 | 现有测试继续覆盖 |
| 文案 / i18n / 数字和路径格式 | 已知健康检查用户可见文本按当前语言显示, 路径仍原样显示 | 中文 renderer 测试 + 视觉验收 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| Overview 中文健康检查内容翻译 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx` |  |
| Hooks hover 健康检查内容翻译 | renderer | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx` |  |
| 全局门禁 | lint/typecheck/test/harness | 全仓 | `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| renderer helper 翻译 Overview 健康检查内容 | 1, 3, 4 |
| Hooks hover 详情复用 helper | 2, 3, 4 |
| 不改 IPC 和主进程扫描结果 | 3, 4 |
