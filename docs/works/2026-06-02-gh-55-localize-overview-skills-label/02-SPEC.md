# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不改数据契约。

## 模块结构 / 组件拆分

- 修改 `src/renderer/src/i18n/locales/zh.json`。
- 扩展 `tests/renderer/overview-health-checks.test.tsx` 或现有 Overview renderer 测试, 增加中文统计卡断言。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改布局, 只修首屏统计卡文案 | renderer 测试 |
| 组件选择 / 设计系统一致性 | 不改组件 | 不适用 |
| 交互反馈 / 状态切换 | 不改交互 | 不适用 |
| loading / empty / error / disabled / focus | 不改状态 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 文案长度更短, 不增加溢出风险 | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | `overview.stats.skills` 中文值改为中文 | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文 Overview 技能统计标签 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx` |  |
| 全局检查 | lint/typecheck/test/harness | 现有测试 | `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中文资源修正 | 1, 2 |
| renderer 测试 | 3 |
| 全局检查与 CI | 4 |
