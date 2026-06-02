# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增设置页本地化测试。
  - tests: `pnpm exec vitest run tests/renderer/settings-page.test.tsx`
  - verify: 中文显示 `报告问题`, 不显示 `Report Issue`; 英文显示 `Report Issue`。
  - evidence: 先运行目标测试复现失败, 中文用例找不到 `报告问题`; 修复后 `pnpm exec vitest run tests/renderer/settings-page.test.tsx` 通过, 1 file / 2 tests。
- [x] 任务 2: 补 locale key 并替换硬编码按钮文案。
  - tests: `pnpm exec vitest run tests/renderer/settings-page.test.tsx`
  - verify: 不改 About 区域布局、链接 URL 或 GitHub 文案。
  - evidence: `settings.reportIssue` 已加入 en/zh locale; `Report Issue` 硬编码已替换为 `t('settings.reportIssue')`; 目标测试验证 GitHub 文案和 issue URL 不变。
- [x] 任务 3: 跑标准门禁。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`
  - verify: UI 文案变更不破坏类型、lint 和任务态。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test` 56 files / 430 tests; `pnpm build`; `pnpm test:e2e` 15 tests 均通过。
- [ ] 任务 4: 推送前确认最近 CI 状态, 推送后等待新 SHA 的 GitHub Actions。
  - tests: `gh run list --repo Caldis/berth --branch master --limit 5`; `gh run watch <run-id> --repo Caldis/berth --exit-status`
  - verify: 本地通过且远端 CI 通过后再继续后续任务。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
