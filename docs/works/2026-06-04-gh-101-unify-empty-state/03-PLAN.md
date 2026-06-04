# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] **T1: 共享 EmptyState 加 fullHeight + PAGE_EMPTY_FILL** (S1 / 验收 1,3)
  - 证据: `pnpm test -- tests/renderer/empty-state.test.tsx` → 4 passed
  - 文件: `src/renderer/src/components/shared/empty-state.tsx`
  - 改: 导出 `PAGE_EMPTY_FILL` 常量; 加 `fullHeight?: boolean`; cn 中 fullHeight 追加 `h-full w-full flex-1`; 占位图结构不变。
  - tests: 新增 `tests/renderer/empty-state.test.tsx` — fullHeight 时容器含 `flex-1`/`h-full`; 默认不含; 占位图与 heading 渲染正常。
  - verify: `pnpm test:renderer -- empty-state` 通过; typecheck 通过。

- [ ] **T2: chrome-less 三页接 flex 高度链** (S2 / 验收 2,3)
  - 文件: `src/renderer/src/pages/sessions.tsx`, `src/renderer/src/pages/session-detail.tsx`, `src/renderer/src/components/memory/memory-view.tsx`
  - 改: 空态分支外包 `<div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>` + `<EmptyState fullHeight .../>`; 非空/loading 分支不动。import PAGE_EMPTY_FILL。
  - tests: 复用并确保现有 `tests/renderer/sessions-pages.test.tsx` 等不破; 视高度撑满为 manual。
  - verify: 现有 renderer 测试通过; 截图: sessions/session-detail/memory 空态填满内容区且居中。

- [ ] **T3: instructions 接 flex 高度链** (S3 / 验收 2,3)
  - 文件: `src/renderer/src/pages/instructions.tsx`
  - 改: 根 `space-y-4` → `cn('flex flex-col gap-4', PAGE_EMPTY_FILL)`; renderContent 两处空态 (465/480) 加 `fullHeight`。
  - tests: 确保现有 `tests/renderer/instructions-guidance.test.tsx` 不破。
  - verify: 测试通过; 截图: instructions 各 tab 空态填满工具条下方、居中、无溢出。

- [ ] **T4: capabilities 删本地 EmptyState + 接 flex 高度链** (S3 / 验收 1,2,3)
  - 文件: `src/renderer/src/pages/capabilities.tsx`
  - 改: 删除本地 `EmptyState` (62-69), import 共享 `{ EmptyState, PAGE_EMPTY_FILL }`; 根 → `cn('flex flex-col gap-4', PAGE_EMPTY_FILL)`; mcp/plugins/default 空态加 `fullHeight`; EnvSection / PermissionsSection 空分支加 `fullHeight`; StatusLineSection 根 → `flex flex-1 flex-col gap-3` + 空态 `fullHeight`。
  - tests: 新增 `tests/renderer/capabilities-empty-state.test.tsx` — 空 tab 渲染共享空态 (堆叠卡片占位图存在, 无单图标本地结构)。
  - verify: 测试通过; 截图: capabilities (插头/拼图等 tab) 空态与其他页一致、填满、居中 (对应原截图 4 场景)。

- [ ] **T5: 总门禁 + 视觉验收** (验收 4,5) — verify 阶段
  - `pnpm harness:prepush` (typecheck/lint/test); B 类局部空态 (overview/settings) 回归未破。
  - electron 实测窗口坐标截图, 对照四张原图场景确认统一 + 填满 + 居中。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
