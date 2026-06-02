# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补齐 en/zh Memory locale key
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx`
  - verify: 2026-06-02 已补齐 en/zh `memory.fileMissing`、`memory.fileMissingBody`、`memory.importance`、`memory.allImportance`、`memory.tags`、`memory.allTags`
- [x] 任务 2: 增加 MemoryView 中文文案 renderer 测试
  - tests: `pnpm exec vitest run tests/renderer/memory-view.test.tsx`
  - verify: 2026-06-02 通过, 6 tests passed; 断言 `文件缺失`、`记忆类型`、`全部类型`、`标签`、`全部标签` 和 missing body 可见
- [x] 任务 3: 收口检查
  - tests: `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-45-localize-memory-labels`
  - verify: 2026-06-02 `pnpm typecheck:web` 通过; `pnpm lint` 通过; `pnpm test` 通过, 56 files / 435 tests; `pnpm harness:check --work docs/works/2026-06-02-gh-45-localize-memory-labels` 通过; UI 结构不变

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
