# 03-PLAN — 实现清单

每步带验证。**N=新文件 (无碰撞, 可随时做); S=共享热点 (并行 WIP, 末尾小步提交 + git diff --cached 核对)**。

## 步骤

1. **[N] 类型** `src/shared/types/memory.ts` (MemoryNote / MemorySource* / MemoryListResult)。
   → verify: `pnpm typecheck` 绿。
2. **[N] 适配抽象** `src/main/memory/types.ts` (MemorySource 接口)。
   → verify: typecheck。
3. **[N] united-memory 源** `src/main/memory/sources/united-memory.ts` (含纯解析 export)。
   → verify: 步骤 6 的单测覆盖。
4. **[N] claude-native 源** `src/main/memory/sources/claude-native.ts` (含纯解析 export)。
   → verify: 步骤 7 的单测覆盖。
5. **[N] 聚合服务** `src/main/memory/index.ts` (listMemory/readMemory + 源注册)。
   → verify: typecheck。
6. **[N] 单测** `tests/unit/memory-united-memory.test.ts` (fixture 含畸形文件)。
   → verify: `pnpm test` 该文件绿; 畸形被排除。
7. **[N] 单测** `tests/unit/memory-claude-native.test.ts`。
   → verify: `pnpm test` 绿。
8. **[S] IPC 契约** `src/shared/types/ipc.ts` + `src/main/ipc/handlers.ts` + `src/preload/index.ts(.d.ts)`
   加 `memory:list` / `memory:get`。→ verify: typecheck; 应用启动无报错。
   → commit gate: 仅当这些文件他人 WIP 已干净时小步提交, `git diff --cached` 只含本任务 hunk。
9. **[N] 渲染 hook+组件** `src/renderer/src/hooks/use-memory.ts` + `components/memory/memory-view.tsx`。
   → verify: typecheck/lint。
10. **[S] 记忆 tab 接线** `pages/instructions.tsx` ("记忆"→MemoryView; claude-md/agents-md→conventions tab)
    + i18n `locales/{en,zh}.json` 补 `memory.*` / `tabs.conventions`。
    → verify: 应用实跑, "记忆" tab 显示真实记忆条目 + 来源标签 + 源过滤; 空态优雅 (**截图验收**)。
11. **门禁** `pnpm typecheck && pnpm lint && pnpm test && pnpm harness:check` 全绿。
    → verify: 全绿 + 面板截图。

## 提交策略 (并发安全)

- 步骤 1-7、9 全是新文件 → 各自完成即可独立小步提交 (只 `git add` 本任务新文件路径)。
- 步骤 8、10 触共享热点文件 → 改动保持最小外科; 提交前 `git diff --cached --stat` 确认不含他人 WIP;
  若该文件仍有他人未提交改动且无法用文件级暂存隔离, **暂缓提交并在 INDEX 记阻塞**, 待其干净再提。
- 不用 worktree (项目约定); 直接在 master 小步提交本任务文件。

## 实现编排建议 (可选 subagent/workflow)

- 步骤 1-7 (类型+两源+服务+单测) 内聚、可由单个 implement 子代理一次性 TDD 落地 (fixture 先行)。
- 步骤 8-10 (IPC+UI 接线) 需我在主线把控共享文件冲突, 不外包。

## 风险回滚

- 任一步 typecheck/test 红 → 退回该步, 不叠加 (见 systematic-debugging)。
- 共享文件冲突 → 不强提; 记阻塞, 人工/时序协调。
