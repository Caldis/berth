# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补 memory source 单测, 覆盖 path traversal、native 时间、索引缺失条目、united-memory 缓存。
  - tests: `pnpm test -- tests/unit/memory-service.test.ts tests/unit/memory-claude-native.test.ts`
  - verify: 新断言先失败, 覆盖 01-ANALYSIS 验收标准 1/2/3/4/6。
- [x] 任务 2: 实现 source 层加固: 路径边界、native 时间、native index list、united-memory missing/cache。
  - tests: `pnpm test -- tests/unit/memory-service.test.ts tests/unit/memory-claude-native.test.ts`
  - verify: 不涉及 UI; 2 个 test files / 25 tests passed。
- [x] 任务 3: 补 MemoryView missing 展示测试并实现缺失提示。
  - tests: `pnpm test -- tests/renderer/memory-view.test.tsx`
  - verify: 1 个 renderer test passed; 缺失 tag 与展开说明可见; View Raw / Show in Explorer 不出现; 页面结构和信息密度不变。
- [ ] 任务 4: 跑 node/web 类型和 harness 验证, 更新 issue resolved 与归档。
  - tests: `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm harness:check`
  - verify: 本任务不需要 Electron 截图 - UI 改动为单组件状态提示, renderer 测试覆盖用户可见行为。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
