# Explore: Usage page usability polish

## 现状理解

1. Usage 页在 renderer 内完成展示, 主数据来自 `window.api.usage.summary({ days, agentView, costMode })`。本任务不需要改主进程、preload 或 shared IPC 契约。
2. `src/renderer/src/pages/usage.tsx` 当前已有:
   - cost mode segmented control, 但只有按钮文本, 没有模式含义提示。
   - `loadError` 错误态, 已经会保留旧 `usage` 数据, 但文案没有说明“正在显示上次成功结果”。
   - pricing gap JSON 示例默认展开, 且无复制按钮。
   - 费用说明中缺少“本地扫描/估算不等于账单”的口径提示。
3. `src/renderer/src/components/shared/token-usage-display.tsx` 当前已有 token 结构条, 但 cache 只合并为一类。title 里也只显示 cache 总数, 没有 cache read / cache write 拆分。
4. i18n 文件 `en.json` / `zh.json` 已有其他 agent 的未提交改动, 本任务必须只暂存 usage 命名空间内新增文案 hunk。
5. 当前测试集中 `tests/renderer/sessions-pages.test.tsx` 已覆盖 Usage 的 cost mode、pricing gap、错误重试; `tests/unit/token-usage.test.ts` 覆盖 token segment helper。后续应在这些测试上追加行为断言。

## 关联与依赖

- Renderer: `src/renderer/src/pages/usage.tsx`, `src/renderer/src/components/shared/token-usage-display.tsx`
- Shared token helper: `src/shared/token-usage.ts`
- i18n: `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`
- Tests: `tests/renderer/sessions-pages.test.tsx`, `tests/unit/token-usage.test.ts`
- 可选辅助组件: 新增 renderer shared tooltip 组件, 但应保持轻量, 不引入新依赖。

## 验收标准

A1. cost mode 的三个按钮有明确可发现的解释, 且保留当前切换行为。

A2. cost mode segmented control 使用 `radiogroup` / `radio` 语义, 当前选中项可被辅助技术识别。

A3. token detail 展示能把 cache read 和 cache write 拆开, hover/title 或可见文本能看到分项数值。

A4. pricing gap 的 local override JSON 示例默认收起, 用户可以展开查看。

A5. pricing gap JSON 示例有复制按钮; 点击后调用剪贴板 API, 并给出已复制反馈。

A6. Usage 页显示数据口径提示: 本地扫描和估算值不一定等于供应商账单。

A7. 初次加载 usage 时显示 skeleton, 而不是把未知值显示成稳定内容。

A8. 刷新失败但已有旧数据时, 页面继续显示旧数据, 并明确提示正在显示上次成功结果。

A9. 相关测试覆盖新增行为, 至少包含 renderer 行为和 token helper 行为。

## 未决问题

无 PRD 级阻塞。模型/项目点开查看组成、虚拟列表、完整动画可作为后续阶段, 不阻塞本轮按优先级先落地 1-6。
