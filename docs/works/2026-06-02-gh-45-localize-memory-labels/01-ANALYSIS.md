# 需求分析 (Explore 产物)

## 现状理解

涉及模块:
- `src/renderer/src/components/memory/memory-view.tsx`: 使用 `t(key, fallback)` 渲染 Memory 页面状态、筛选和按钮文案。
- `src/renderer/src/i18n/locales/en.json` / `zh.json`: 当前缺少部分 Memory 页面 key。
- `tests/renderer/memory-view.test.tsx`: 已覆盖 missing note、filter、markdown navigation, 但没有覆盖中文 locale。

## 关联与依赖

- `memory-view.tsx` 的 fallback 设计用于 locale 滞后时页面仍可读, 但产品稳定后应补齐 locale key。
- 这次只补现有组件已经引用的 key, 不改交互或布局。
- 测试应跟现有 renderer i18n 测试一致, 通过 `i18n.changeLanguage('zh')` 验证中文可见文案。

## 验收标准

1. zh locale 包含 missing file、missing body、importance、all importance、tags、all tags。
2. en locale 包含同名 key, 避免英文界面依赖组件 fallback。
3. MemoryView renderer 测试切到 zh 后能断言这些可见中文文案。
4. `pnpm exec vitest run tests/renderer/memory-view.test.tsx` 通过。
5. `pnpm typecheck:web` 和 `pnpm harness:check --work docs/works/2026-06-02-gh-45-localize-memory-labels` 通过。
6. push 前当前 master 最近 GitHub Actions 不处于由本会话提交造成的失败状态; push 后等待新 SHA 对应 Actions 完成。

## 界面质量与交互验收

该任务只修中文文案。验收重点是中文界面不出现英文 fallback, 标签长度在现有 chip/button 宽度内可读, 不改布局层级。

## 未决问题

无。
