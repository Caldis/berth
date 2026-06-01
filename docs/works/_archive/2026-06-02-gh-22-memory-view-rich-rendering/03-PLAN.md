# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 安装 markdown renderer 依赖并提交依赖变更。
  - tests: `pnpm typecheck:web`
  - verify: `pnpm typecheck:web` 通过; `package.json` 只新增 `react-markdown@10.1.0` / `remark-gfm@4.0.1`, `pnpm-lock.yaml` 新增对应依赖树。
- [x] 任务 2: 补 renderer 测试, 覆盖 markdown 渲染、正文双链点击、importance/tag 过滤。
  - tests: `pnpm test -- tests/renderer/memory-view.test.tsx`
  - verify: 通过, 5 tests passed; 新测试先暴露了纯文本/无过滤问题, 实现后通过。
- [x] 任务 3: 实现 MemoryView markdown 渲染、正文双链按钮和 importance/tag filter。
  - tests: `pnpm test -- tests/renderer/memory-view.test.tsx`
  - verify: 通过, 5 tests passed; 过滤区保持紧凑, 正文渲染不使用 dangerous HTML。
- [x] 任务 4: 补 unit 测试并实现 united-memory 正文双链提取。
  - tests: `pnpm test -- tests/unit/memory-service.test.ts`
  - verify: 通过, 19 tests passed; frontmatter links 与正文 `[[name]]` 合并去重。
- [x] 任务 5: 跑类型检查和 harness 检查, 更新任务状态。
  - tests: `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm harness:check`
  - verify: `pnpm typecheck:web` 通过; `pnpm typecheck:node` 通过; `pnpm harness:check` 通过。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
