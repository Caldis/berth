# Spec: Usage page usability polish

## 范围

本轮只做高优先级体验改进:

1. cost mode tooltip + 可访问语义。
2. token cache read/write 拆分提示。
3. pricing gap JSON 示例默认收起 + 复制按钮。
4. 数据口径提示。
5. 初次加载 skeleton。
6. 错误态保留旧数据并明确说明。

暂不做模型/项目明细展开、虚拟列表和更完整动画, 避免扩大实现面。

## 组件与数据

### `tokenUsageSegments`

保留现有 `input/output/cache/reasoning/unknown` segment, 不改外部返回形状。

新增 `tokenUsageSegmentTitle(usage, id)` 或等价 helper, 供 UI 生成 tooltip 文本:

- `cache`: 同时显示 cache read 与 cache write。
- `reasoning`: 显示 reasoning tokens。
- `unknown`: 显示 unknown tokens。

验收: A3, A9。

### `TokenUsageDisplay`

detail 模式:

- 结构条每段继续用文字 legend, 不只靠颜色。
- cache 分段的 `title` 包含 read/write 数值。
- detail 文本中 cache 行改为 `Cache: total (read X / write Y)` 或等价短文案。

验收: A3。

### `Usage`

新增本地 UI 状态:

- `hasLoadedOnce`: 初次请求完成后置 true。
- `expandedPricingOverride`: 控制 JSON 示例展开。
- `copyState`: 复制按钮短暂显示 copied 状态。

行为:

- cost mode segmented control 用 `role="radiogroup"` 和 `role="radio"`。
- cost mode 按钮 title 使用 i18n 文案。
- 初次加载且没有 `usage` 时显示 skeleton summary + skeleton panel。
- 失败且已有 `usage` 时显示错误 banner, 文案说明正在显示上次成功结果。
- pricing override 示例默认收起, 点击按钮展开。
- 复制按钮优先使用 `navigator.clipboard.writeText`, 不可用时静默禁用或不渲染成功状态。
- 费用说明中增加数据口径提示。

验收: A1, A2, A4, A5, A6, A7, A8。

## i18n

只在 `usage` 命名空间新增:

- cost mode tooltip 文案。
- cache read/write 文案。
- data scope notice 文案。
- loading skeleton aria 文案。
- stale data error 文案。
- pricing override 展开/收起/复制/已复制文案。

验收: A1, A3, A5, A6, A8。

## 测试策略

1. `tests/unit/token-usage.test.ts`
   - cache segment title 包含 read/write。

2. `tests/renderer/sessions-pages.test.tsx`
   - cost mode controls 有 radio 语义和 title。
   - 初次加载显示 loading skeleton。
   - IPC 失败后已有旧数据时仍显示旧 token, 同时显示 stale 文案。
   - pricing override 默认收起, 点击展开后可看到 JSON, 点击复制调用 clipboard。

3. 验证命令:
   - `pnpm test -- tests/unit/token-usage.test.ts tests/renderer/sessions-pages.test.tsx`
   - `pnpm typecheck:web`
   - 涉及 docs 后跑 `pnpm harness:check`
