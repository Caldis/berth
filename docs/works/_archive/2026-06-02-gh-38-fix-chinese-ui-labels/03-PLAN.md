# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补中文 locale 漏翻。
  - tests: `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx tests/renderer/feature-guide-panel.test.tsx`
  - verify: 中文设置标题和 evidence provider 标签都显示中文; 不改布局。
  - evidence: `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx tests/renderer/feature-guide-panel.test.tsx` 通过, 2 files / 13 tests。
- [x] 任务 2: 本地门禁。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`
  - verify: 目标测试与标准门禁通过。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test` (54 files / 424 tests); `pnpm build`; `pnpm test:e2e` (15 tests) 均通过。
- [x] 任务 3: 推送后等待 GitHub Actions。
  - tests: `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status`
  - verify: 新 SHA 对应 CI run 成功。
  - evidence: `gh run watch 26798195124 --repo Caldis/berth --exit-status` 通过; SHA `6f314c4bda43f68429239950f9e2c4e36f0ae6f1`; Ubuntu 和 Windows job 均成功。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
