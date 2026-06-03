# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。按顺序执行; 共享类型变更会影响主进程与 renderer, 不并行。

- [ ] 任务 1: 删除共享 `team` / `teams` 契约和主进程扫描产出
  - scope: `src/shared/types/asset.ts`, `src/main/adapters/claude-code/scanner.ts`, `src/main/adapters/claude-code/parsers.ts`, scanner/runtime/stats 派生, unit fixtures
  - tests: `pnpm test -- tests/unit/agent-capability-plugins.test.ts tests/unit/agent-asset-runtime.test.ts tests/unit/asset-worker-host.test.ts tests/unit/project-scope-runtime.test.ts`; `pnpm typecheck:node`
  - verify: 不再产出 `type: team`; `TeammateIdle` hook event 保留; 共享 stats 无 `teams`

- [ ] 任务 2: 删除 renderer 入口、路由、搜索和 guide 文案
  - scope: `App.tsx`, `nav-config.ts`, `instructions.tsx`, `search-dialog.tsx`, `feature-guidance.ts`, `asset-guidance.ts`, en/zh i18n, renderer tests
  - tests: `pnpm test -- tests/renderer/app-routing.test.tsx tests/renderer/sidebar-agent-view.test.tsx tests/renderer/instructions-guidance.test.tsx tests/renderer/search-dialog.test.tsx`; `pnpm typecheck:web`
  - verify: 侧边栏不显示 Agent Teams; `/instructions/agent-teams` redirect 到 `/instructions/subagents`; 搜索不再生成 Agent Teams 路由; 页面无 missing i18n key

- [ ] 任务 3: 全局残留、harness 和任务态收口
  - scope: docs/works 当前任务、必要冷文档引用
  - tests: `rg -n "agentTeams|agent-teams|Agent Teams|parseTeam|type === 'team'|type: 'team'|teams:" src tests`; `pnpm harness:check --work docs/works/2026-06-04-gh-94-remove-agent-teams`
  - verify: 只保留当前任务/issue/历史 archive 中的 Agent Teams 文本; INDEX phase 推进到 verify

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
