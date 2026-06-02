# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增 locale key:

- `sessions.fallbackTitle`: `Session #{{id}}` / `会话 #{{id}}`

`id` 使用现有短 id: `session.id.slice(0, 8)` 或详情页 URL `id?.slice(0, 8)`。

## 模块结构 / 组件拆分

保持现有页面边界, 不抽新组件。原因: 当前只有三个简单渲染点, 均已持有 `t`; 抽组件会增加跨页面依赖, 收益不足。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 只替换文本来源, 不新增行或标签 | renderer 测试确认原有内容仍可见 |
| 组件选择 / 设计系统一致性 | 继续使用原有文本节点和 `truncate` 样式 | 代码审查 |
| 交互反馈 / 状态切换 | 不改点击、tab、filter、group 逻辑 | 既有测试继续通过 |
| loading / empty / error / disabled / focus | 不改状态分支 | 既有测试继续通过 |
| 响应式 / 可访问性 / 键盘可达 | 文案长度接近原文, 保持可截断 | renderer 测试 + 代码审查 |
| 文案 / i18n / 数字和路径格式 | locale key 管理 fallback, 保留短 id 格式 | 中文 fallback 测试 |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 无标题 session fallback | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx` |  |
| 收口检查 | typecheck / harness |  | `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-47-localize-session-fallback-titles` |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `sessions.fallbackTitle` locale key | 1, 2 |
| 三个页面 fallback 使用 `t` | 1, 2, 3, 4 |
| 中文 renderer 测试 | 1, 3, 4 |
