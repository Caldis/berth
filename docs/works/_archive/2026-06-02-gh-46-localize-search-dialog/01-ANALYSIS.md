# 需求分析 (Explore 产物)

## 现状理解

涉及模块:
- `src/renderer/src/components/layout/search-dialog.tsx`: quick actions 当前直接存英文 `label`。
- `src/renderer/src/i18n/locales/en.json` / `zh.json`: 已有 `nav.*` 页面名, 可复用。
- `src/renderer/src/stores/app.ts`: 搜索弹窗是否打开由 zustand store 的 `searchOpen` 控制。

## 关联与依赖

- 不需要新增 locale key; 现有 `nav.overview`、`nav.sessions`、`nav.instructions`、`nav.capabilities`、`nav.usage` 已满足。
- `QuickAction.group` 当前未渲染, 本任务不扩展分组展示, 只处理已可见页面名。
- 测试应直接打开 store 中的 search dialog, 用 MemoryRouter 提供 navigate 上下文。

## 验收标准

1. Search dialog quick actions 不再硬编码英文 label。
2. 中文 UI 下搜索弹窗显示本地化页面名。
3. Renderer 测试覆盖中文 quick actions。
4. `pnpm exec vitest run tests/renderer/search-dialog.test.tsx` 通过。
5. `pnpm typecheck:web` 和 `pnpm harness:check --work docs/works/2026-06-02-gh-46-localize-search-dialog` 通过。
6. push 前当前 master 最近 GitHub Actions 不处于由本会话提交造成的失败状态; push 后等待新 SHA 对应 Actions 完成。

## 界面质量与交互验收

只改文案来源, 不改搜索弹窗布局。中文页面名长度短于英文, 不会造成溢出。

## 未决问题

无。
