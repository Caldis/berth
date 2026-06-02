# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

`tests/setup.ts` 提供测试环境契约:
- `ResizeObserverMock` 保存构造传入的 callback。
- `observe(target)` 立即用非零 `contentRect` 通知当前目标尺寸。
- DOM 尺寸 fallback 使用测试环境默认图表尺寸, 只在元素本身没有显式尺寸时生效。

默认 fallback:
- width: `800`
- height: `400`

## 模块结构 / 组件拆分

- 只修改 `tests/setup.ts`。
- 新增小型 helper:
  - `readCssPixelValue(value)`: 解析 `style.width` / `style.height` 的像素值。
  - `readElementSize(element, axis)`: 优先取 inline style 的 px 值, 否则使用 fallback。
  - `createContentRect(target)`: 生成 `ResizeObserverEntry.contentRect`。

不修改 renderer 页面组件。

## 界面质量与交互验收

不适用。该任务只调整测试环境。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改 UI | 不适用 |
| 组件选择 / 设计系统一致性 | 不改 UI | 不适用 |
| 交互反馈 / 状态切换 | 不改 UI | 不适用 |
| loading / empty / error / disabled / focus | 不改 UI | 不适用 |
| 响应式 / 可访问性 / 键盘可达 | 不改 UI | 不适用 |
| 文案 / i18n / 数字和路径格式 | 不改 UI | 不适用 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| ResizeObserver 在 jsdom 中提供非零尺寸 | renderer | `tests/renderer/sessions-pages.test.tsx` | `pnpm exec vitest run tests/renderer/sessions-pages.test.tsx` | 目标测试覆盖真实触发路径 |
| TypeScript 类型契约 | typecheck | 全量 web 类型 | `pnpm typecheck:web` | 不适用 |
| harness 任务结构 | harness | docs/works | `pnpm harness:check --work docs/works/2026-06-02-gh-44-silence-recharts-test-warnings` 和最终 `pnpm harness:check` | 不适用 |

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| ResizeObserver mock 提供非零尺寸 | 1, 2 |
| 只修改测试环境, 不改 UI 业务组件 | 2 |
| 目标测试、typecheck、harness 检查 | 1, 3, 4 |
| push 前后 CI 状态检查 | 5 |
