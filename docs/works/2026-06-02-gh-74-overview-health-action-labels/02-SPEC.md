# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约
不新增 IPC 或持久化契约。忽略健康检查仍写入 `localStorage['berth-ignored-health-checks']`, 复制仍使用 `navigator.clipboard.writeText(...)`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `src/renderer/src/pages/overview.tsx`: 给 ignore info 和 copy fix snippet 两个 icon-only 按钮补 `aria-label`, 值与现有 `title` 一致。
- `tests/renderer/overview-health-checks.test.tsx`: 把按钮查询从 `getByTitle` 改为 role/name 查询, 并覆盖中文名称。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不新增可见文字, 保留图标按钮 | Electron 截图 |
| 组件选择 / 设计系统一致性 | 继续使用现有按钮和 lucide 图标 | 代码 diff 检查 |
| 交互反馈 / 状态切换 | 不改点击处理; 复制后仍显示 check 图标 | renderer 测试 |
| loading / empty / error / disabled / focus | 本任务不改 loading/empty/error; focus 语义更完整 | role/name 测试 |
| 响应式 / 可访问性 / 键盘可达 | icon-only 按钮暴露 localized accessible name | Testing Library + CDP |
| 文案 / i18n / 数字和路径格式 | 复用现有 `overview.healthCheckActions.*` | 英文/中文测试 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 英文 ignore/copy 按钮可通过 role/name 查询且行为不变 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` | 不适用 |
| 中文 ignore/copy 按钮可通过 role/name 查询 | renderer | `tests/renderer/overview-health-checks.test.tsx` | `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` | 不适用 |
| 真实 Overview 页面按钮有 accessible name 且布局不变 | manual UI | Electron dev 实例 | CDP role/name 查询 + 截图 | 自动化截图只作辅助, 行为由 renderer 测试覆盖 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 两个按钮补 `aria-label` | 1, 2, 3, 5 |
| renderer 测试改为 role/name 查询并保留行为断言 | 1, 2, 3, 4, 6 |
| UI 实测 Overview 健康检查区域 | 5, 6 |
