# Plan - 搜索快捷键区分

从 `02-SPEC.md` 拆解。实现阶段按顺序推进, 因为同一组 layout/search 文件和测试相互耦合, 不并行拆分。

- [ ] 1. 更新 renderer 测试, 先钉住快捷键新契约。
  - tests: `tests/renderer/top-navigation.test.tsx`, `tests/renderer/top-navigation-search.test.tsx`, `tests/renderer/search-dialog.test.tsx`, `tests/renderer/sessions-pages.test.tsx`, `tests/renderer/memory-view.test.tsx`
  - verify: 目标 vitest 应先暴露旧实现冲突; 界面验收覆盖快捷键文案、focus 状态和全局弹窗状态。

- [ ] 2. 拆分 global/page 快捷键 label 与键盘触发逻辑。
  - tests: 同任务 1 的 renderer 测试。
  - verify: Ctrl/Cmd+K 打开全局搜索; Ctrl/Cmd+Shift+K focus/select 页内搜索; 两个入口显示不同快捷键。

- [ ] 3. 运行目标门禁并小步提交实现。
  - tests: `pnpm vitest run tests/renderer/top-navigation.test.tsx tests/renderer/top-navigation-search.test.tsx tests/renderer/search-dialog.test.tsx tests/renderer/sessions-pages.test.tsx tests/renderer/memory-view.test.tsx`
  - verify: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-13-gh-130-shortcut-conflict-between-searches`

- [ ] 4. verify 阶段做全量和交互验收。
  - tests: `pnpm lint`, `pnpm typecheck`, `pnpm test`
  - verify: 在实际 Electron 窗口或等价浏览器自动化中验证 Windows 路径: Ctrl+K 打开全局搜索, Ctrl+Shift+K 聚焦页内搜索; 完成后归档并等待最终 CI。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
