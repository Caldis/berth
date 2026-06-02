# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

`QuickAction` 从:
- `label: string`
- `group: string`

调整为:
- `labelKey: string`

渲染时使用 `t(action.labelKey)`。

## 模块结构 / 组件拆分

- 修改 `src/renderer/src/components/layout/search-dialog.tsx`。
- 新增 `tests/renderer/search-dialog.test.tsx`。
- 不修改 locale JSON。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改结构 | renderer 测试 |
| 组件选择 / 设计系统一致性 | 复用现有 button/action | 不新增组件 |
| 交互反馈 / 状态切换 | 保持打开和点击导航逻辑 | renderer 测试可打开弹窗 |
| loading / empty / error / disabled / focus | 不适用 | 不改相关状态 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 层级 | 现有行为不回退 |
| 文案 / i18n / 数字和路径格式 | 使用 `nav.*` key | 中文 renderer 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文 quick action 页面名 | renderer | `tests/renderer/search-dialog.test.tsx` | `pnpm exec vitest run tests/renderer/search-dialog.test.tsx` | 不适用 |
| web 类型 | typecheck | renderer | `pnpm typecheck:web` | 不适用 |
| harness 任务结构 | harness | docs/works | `pnpm harness:check --work docs/works/2026-06-02-gh-46-localize-search-dialog` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| quick action 使用 i18n key | 1, 2 |
| renderer 测试 | 3, 4 |
| 本地检查和 CI | 5, 6 |
