# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。按顺序执行; 共享类型变更会影响主进程与 renderer, 不并行。

- [x] 任务 1: 删除共享 `team` / `teams` 契约和主进程扫描产出
  - scope: `src/shared/types/asset.ts`, `src/main/adapters/claude-code/scanner.ts`, `src/main/adapters/claude-code/parsers.ts`, scanner/runtime/stats 派生, unit fixtures
  - tests: `pnpm test -- tests/unit/agent-capability-plugins.test.ts tests/unit/agent-asset-runtime.test.ts tests/unit/asset-worker-host.test.ts tests/unit/project-scope-runtime.test.ts` 通过, 27 tests passed; `pnpm typecheck:node` 通过。
  - verify: 不再产出 `type: team`; `TeammateIdle` hook event 保留; 共享 stats 无 `teams`。

- [x] 任务 2: 删除 renderer 入口、路由、搜索和 guide 文案
  - scope: `App.tsx`, `nav-config.ts`, `instructions.tsx`, `search-dialog.tsx`, `feature-guidance.ts`, `asset-guidance.ts`, en/zh i18n, renderer tests
  - tests: `pnpm exec vitest run tests/renderer/app-routing.test.tsx tests/renderer/sidebar-agent-view.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/search-dialog.test.tsx --reporter=verbose` 通过, 25 tests passed; `pnpm typecheck:web` 通过。
  - verify: 侧边栏不显示 Agent Teams; `/instructions/agent-teams` redirect 到 `/instructions/subagents`; 搜索不再生成 Agent Teams 路由; 页面无 missing i18n key

- [x] 任务 3: 全局残留、harness 和任务态收口
  - scope: docs/works 当前任务、必要冷文档引用
  - tests: fixed-string residual scan 覆盖 `agentTeams`, `agent-teams`, `Agent Teams`, `parseTeam`, `type === 'team'`, `type: 'team'`, `teams:`; `pnpm harness:check --work docs/works/2026-06-04-gh-94-remove-agent-teams` 通过。
  - verify: `agent-teams` / `Agent Teams` 只保留在旧 URL redirect 和回归测试; `INDEX.phase` 已推进到 verify

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
