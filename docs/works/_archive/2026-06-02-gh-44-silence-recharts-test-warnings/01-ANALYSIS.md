# 需求分析 (Explore 产物)

## 现状理解

涉及模块:
- `src/renderer/src/pages/usage.tsx`: Usage 页面包含两个 `ResponsiveContainer`, renderer test 会覆盖该页面。
- `src/renderer/src/pages/overview.tsx`: Overview 页面也使用 `ResponsiveContainer`, 但当前噪声主要由 session/usage 测试触发。
- `tests/setup.ts`: 全局 jsdom 测试环境。目前只安装空的 `ResizeObserverMock`, 没有给观察目标返回尺寸。
- `tests/renderer/sessions-pages.test.tsx`: 目标复现测试。历史任务多次把该 warning 标为既有噪声。

Recharts 官方 API 说明 `ResponsiveContainer` 会根据父元素尺寸调整图表, 并使用 `ResizeObserver` 监听父元素尺寸变化。因此 jsdom 测试若没有真实 layout, 需要在测试环境里补足浏览器会提供的尺寸信号。

## 关联与依赖

- 问题不在 Usage 页面业务逻辑。浏览器运行时容器有 CSS 尺寸, jsdom 默认没有真实布局计算。
- 不应在产品组件里加入 test-only props 或硬编码宽高; 这会把测试环境限制带进 UI 代码。
- 更窄的修复位置是 `tests/setup.ts`, 让现有图表和未来 renderer 测试共享同一套可预期尺寸模拟。
- 需要避免过宽地改变所有 DOM 元素行为。尺寸 mock 只应给默认 0 尺寸场景提供合理 fallback, 不覆盖测试主动设置的尺寸。

## 验收标准

1. `tests/renderer/sessions-pages.test.tsx` 通过, 且不再输出 Recharts zero-size warning。
2. `tests/setup.ts` 的尺寸模拟保留测试主动设置的 DOM 尺寸; 只在 jsdom 默认 0 宽高时提供 fallback。
3. `pnpm typecheck:web` 通过。
4. `pnpm harness:check` 通过。
5. push 前当前 master 最近 GitHub Actions 不处于由本会话提交造成的失败状态; push 后等待新 SHA 对应 Actions 完成。

## 界面质量与交互验收

不适用。该任务只调整测试环境模拟, 不改用户可见 UI。

## 未决问题

无。
