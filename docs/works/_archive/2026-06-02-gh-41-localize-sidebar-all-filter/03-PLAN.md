# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补 sidebar agent view 中文测试。
  - tests: `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx`
  - verify: 2026-06-02 12:58 `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx` 通过; 中文 all option 显示 `全部`, 不显示 `All`。
- [x] 任务 2: 修复中文 locale。
  - tests: `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx`
  - verify: 2026-06-02 12:58 `pnpm exec vitest run tests/renderer/sidebar-agent-view.test.tsx` 通过; `agentView.all` 中文值为 `全部`; 英文值不变。
- [x] 任务 3: 跑标准门禁。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`
  - verify: 2026-06-02 12:58 `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test`; `pnpm build`; `pnpm test:e2e` 均通过。
- [x] 任务 4: 推送前确认最近 CI 状态, 推送后等待新 SHA 的 GitHub Actions。
  - tests: `gh run list --repo Caldis/berth --branch master --limit 5`; `gh run watch <run-id> --repo Caldis/berth --exit-status`
  - verify: 2026-06-02 13:00 push 前最近 5 次 master CI 均为 success; 2026-06-02 13:04 `gh run watch 26799484001 --repo Caldis/berth --exit-status` 通过, SHA `fd60b144eba3adbb42fa4b8529fefd41746b55b9`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
