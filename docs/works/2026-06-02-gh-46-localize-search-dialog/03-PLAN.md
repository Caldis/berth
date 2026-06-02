# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: SearchDialog quick actions 改用 `nav.*` i18n key
  - tests: `pnpm exec vitest run tests/renderer/search-dialog.test.tsx`
  - verify: 2026-06-02 已改为 `labelKey: nav.*`; 中文页面名可见, 英文 hard-coded label 不再作为数据源
- [x] 任务 2: 增加中文搜索弹窗 renderer 测试
  - tests: `pnpm exec vitest run tests/renderer/search-dialog.test.tsx`
  - verify: 2026-06-02 通过, 1 test passed; 断言 `总览`、`会话`、`指令`、`能力`、`用量` 可见, 英文页面名不可见
- [x] 任务 3: 收口检查
  - tests: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-46-localize-search-dialog`
  - verify: 2026-06-02 `pnpm typecheck:web` 通过; `pnpm lint` 通过; `pnpm test` 通过, 57 files / 436 tests; `pnpm harness:check --work docs/works/2026-06-02-gh-46-localize-search-dialog` 通过; UI 结构不变

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
