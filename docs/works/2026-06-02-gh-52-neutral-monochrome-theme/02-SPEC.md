# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

不涉及 IPC、持久化或外部数据契约。只调整渲染端 CSS token 和 Usage 图表 palette。

## 模块结构 / 组件拆分

- `src/renderer/src/styles/globals.css`
  - light: 将 `--primary`、`--accent`、`--sidebar-accent`、`--ring` 改为中性近黑。
  - dark: 将 `--primary`、`--accent`、`--sidebar-accent`、`--ring` 改为中性近白。
  - `--chart-*` 改为低饱和中性/冷灰 palette, 去掉旧橙色 token。
- `src/renderer/src/pages/usage.tsx`
  - `CHART_COLORS` 改为 `hsl(var(--chart-N))`, 与 Overview 保持一致。
- `tests/renderer/theme-palette.test.ts`
  - 增加轻量回归测试, 防止旧橙色重新成为 accent/chart token 或 Usage palette 硬编码。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改布局, 只改 token | 截图核对侧边栏、内容区和图表没有错位 |
| 组件选择 / 设计系统一致性 | 继续使用现有 Tailwind token | `pnpm typecheck:web`; 截图 |
| 交互反馈 / 状态切换 | active/hover/focus 继续走 `accent` / `ring` | 截图核对 active 状态可见 |
| loading / empty / error / disabled / focus | 不改状态结构, warning/error 色保留 | 代码 diff 与截图核对 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 和 aria | 目标测试 + 类型检查 |
| 文案 / i18n / 数字和路径格式 | 不改文案 | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| 旧橙色不再作为主题 accent/chart token | renderer | `tests/renderer/theme-palette.test.ts` | `pnpm exec vitest run tests/renderer/theme-palette.test.ts` |  |
| Usage 图表 palette 读取 chart token | renderer | `tests/renderer/theme-palette.test.ts` | `pnpm exec vitest run tests/renderer/theme-palette.test.ts` |  |
| 视觉状态符合黑白主题方向 | manual | 截图验收 | 本地打开应用截图 | 视觉质量需人工核对 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| 中性全局 token | 1, 2 |
| Usage palette 使用 chart token | 3 |
| 保留语义状态色 | 4 |
| 本地与截图验证 | 5 |
