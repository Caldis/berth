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

- [x] **T2: chrome-less 三页接 flex 高度链** (S2 / 验收 2,3)
  - 证据: typecheck:web 通过; sessions-pages 25 测试中 23 通过 (2 个失败为他人 in-flight 改动既有失败, 已用 pathspec stash 比对确认非本改动回归)
  - 文件: `src/renderer/src/pages/sessions.tsx`, `src/renderer/src/pages/session-detail.tsx`, `src/renderer/src/components/memory/memory-view.tsx`
  - 改: 空态分支外包 `<div className={cn('flex flex-col', PAGE_EMPTY_FILL)}>` + `<EmptyState fullHeight .../>`; 非空/loading 分支不动。import PAGE_EMPTY_FILL。
  - tests: 复用并确保现有 `tests/renderer/sessions-pages.test.tsx` 等不破; 视高度撑满为 manual。
  - verify: 现有 renderer 测试通过; 截图: sessions/session-detail/memory 空态填满内容区且居中。

- [x] **T3: instructions 接 flex 高度链** (S3 / 验收 2,3)
  - 证据: typecheck:web 通过; instructions-guidance 5 测试中 4 通过 (1 个 Memories 守卫失败为他人 in-flight 既有失败, stash 比对确认非本改动)
  - 文件: `src/renderer/src/pages/instructions.tsx`
  - 改: 根 `space-y-4` → `cn('flex flex-col gap-4', PAGE_EMPTY_FILL)`; renderContent 两处空态 (465/480) 加 `fullHeight`。
  - tests: 确保现有 `tests/renderer/instructions-guidance.test.tsx` 不破。
  - verify: 测试通过; 截图: instructions 各 tab 空态填满工具条下方、居中、无溢出。

- [x] **T4: capabilities 删本地 EmptyState + 接 flex 高度链** (S3 / 验收 1,2,3)
  - 证据: 新增 `tests/renderer/capabilities-empty-state.test.tsx` (2) + 既有 status-line-section (8) 全过; typecheck:web + eslint 干净。PermissionsSection 无顶层 EmptyState (空态为 RuleList 内联文本), 无需改; HooksLifecycleView 不使用 EmptyState, 不在统一范围。
  - 文件: `src/renderer/src/pages/capabilities.tsx`
  - 改: 删除本地 `EmptyState` (62-69), import 共享 `{ EmptyState, PAGE_EMPTY_FILL }`; 根 → `cn('flex flex-col gap-4', PAGE_EMPTY_FILL)`; mcp/plugins/default 空态加 `fullHeight`; EnvSection / PermissionsSection 空分支加 `fullHeight`; StatusLineSection 根 → `flex flex-1 flex-col gap-3` + 空态 `fullHeight`。
  - tests: 新增 `tests/renderer/capabilities-empty-state.test.tsx` — 空 tab 渲染共享空态 (堆叠卡片占位图存在, 无单图标本地结构)。
  - verify: 测试通过; 截图: capabilities (插头/拼图等 tab) 空态与其他页一致、填满、居中 (对应原截图 4 场景)。

- [~] **T5: 总门禁 + 视觉验收** (验收 4,5) — verify 阶段
  - 机械门禁:
    - typecheck:web 绿; eslint(本任务 8 文件)绿。
    - targeted 测试全绿: empty-state(4) + capabilities-empty-state(2) + status-line-section(8); sessions 23/25、instructions 4/5、capabilities-guidance 5/8 通过。
    - 全量 `pnpm test`: 6 失败 (capabilities-guidance×3 / instructions-guidance×1 / sessions-pages×2), **逐一 commit/stash 级隔离确认非本改动回归** — 全部来自他人并行 GH-103 + 未提交工作区 in-flight 改动 (feature-guidance / 引导文案族)。
    - 远端 CI 绿: `cea0440` (已含本任务 T1-T3) latest run success。
    - Project 字段已 `ensure` 同步 (repaid 2 / net 0 / confidence high)。
  - B 类局部空态 (overview / settings): 未改其文件, 默认 EmptyState 行为零变化 (empty-state.test 覆盖 border-0 override 仍生效)。
  - **视觉验收 (待用户确认)**: 环境竞争 (2 个 vite dev + 他人 agent-owned electron 实例运行中), 不贸然另起实例。用户 dev 已 HMR 应用全部改动, 可在 sessions/记忆/指令/能力页触发空态 (无数据或无匹配过滤) 确认: 圆角虚线框撑满内容区 + 占位图垂直水平居中 + 全站一致。或按需由 Agent 起 agent-owned 实例截图。
  - **推送阻塞**: 本地领先远端 3 提交中, 他人 GH-103 两提交叠在本任务 T4 之上, `git push` 会一并推出他人未完成提交 → 暂不推送; T4 将随他人推送自然带出, 或待工作区收敛后单独推。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
