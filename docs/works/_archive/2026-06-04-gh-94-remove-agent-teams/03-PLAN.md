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

2026-06-04 verify:
- 测试覆盖审计: 任务 1/2/3 均有自动化测试或残留检查证据; `TeammateIdle` hook event 保留, 不属于静态 asset 删除范围。
- 机械检查: `pnpm lint` 通过; `pnpm typecheck` 通过; `pnpm test` 通过, 85 test files / 619 tests passed。`pnpm test` 有既有 React `act(...)` warning, 但无失败用例。
- harness: `pnpm harness:check` 通过; `pnpm harness:stats` 返回 `debt total=17 status=ok`。
- Project: `node scripts/harness-projects.mjs ensure docs/works/2026-06-04-gh-94-remove-agent-teams` 返回 `is In Progress`。`node scripts/harness-projects.mjs check --strict` 失败项来自 GH-90 和未跟踪 GH-95, 不涉及 GH-94。
- CI baseline: `gh run list --branch master --limit 5` 显示 master 最新 5 个 CI 均为既有 failure, 最近失败提交不是本任务本地提交。
- UI 实测: `pnpm dev:agent guard before --id gh94-agent-teams-removal --json`; `pnpm dev:agent start --id gh94-agent-teams-removal --debug-port 9344 --json`; CDP 检查侧边栏前后无 Agent Teams, 点击子代理页后正文无 Agent Teams 且有子代理内容。
- 截图: `pnpm dev:agent screenshot gh94-agent-teams-removal --mode print-window --json` 生成 `C:\Users\mail\AppData\Local\Temp\berth-agent-dev\gh94-agent-teams-removal\screenshot.png`, 视觉确认侧边栏无 Agent Teams, 子代理页布局正常。
- 清理: `pnpm dev:agent stop gh94-agent-teams-removal --json` 成功; `pnpm dev:agent guard after --id gh94-agent-teams-removal --json` 返回 `guard-ok`, 用户 dev server 保持运行; 用户 Electron 子进程同一 dev server 父进程下发生 watch 重启, 按 verify workflow 视为正常 restart 记录。
