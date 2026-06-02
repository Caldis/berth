# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

无数据契约变化。

## 模块结构 / 组件拆分

修改 `src/renderer/src/components/layout/sidebar.tsx`:

- 将硬编码 `Expand sidebar` / `Collapse sidebar` 改为 `t('nav.expandSidebar')` / `t('nav.collapseSidebar')`。

修改 locale:

- `en.nav.expandSidebar`: `Expand sidebar`
- `en.nav.collapseSidebar`: `Collapse sidebar`
- `zh.nav.expandSidebar`: `展开侧边栏`
- `zh.nav.collapseSidebar`: `折叠侧边栏`

修改 `tests/renderer/sidebar-agent-view.test.tsx`:

- 在中文环境下断言初始按钮 label 为 `折叠侧边栏`。
- 点击后断言 label 变为 `展开侧边栏`。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不修改布局 | 不适用 |
| 组件选择 / 设计系统一致性 | 保持 icon button | renderer 测试 |
| 交互反馈 / 状态切换 | 点击后 accessible label 随状态切换 | renderer 测试 |
| loading / empty / error / disabled / focus | 不修改 | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 修正 icon-only button accessible name | renderer 测试 |
| 文案 / i18n / 数字和路径格式 | 新增 nav label key | renderer 测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 中文折叠按钮 label | renderer | `tests/renderer/sidebar-agent-view.test.tsx` | `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx` |  |
| 收口检查 | renderer/harness | 全量 | `pnpm test`; `pnpm harness:check`; GitHub Actions run |  |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| locale key + Sidebar 使用 `t()` | 1 |
| 中文折叠/展开测试 | 2 |
| 本地和远端验证 | 3 |
