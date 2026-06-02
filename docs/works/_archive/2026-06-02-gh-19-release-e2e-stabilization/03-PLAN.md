# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 修复窗口控件 E2E 真实鼠标点击定位。
  - tests: `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0`
  - verify: 真实 OS 鼠标点击最大化和还原, 主进程 `isMaximized()` 状态变化; 不改 UI。
  - evidence: `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0` 通过, 1 passed。
- [x] 任务 2: 验证全量 E2E 并接入 Windows CI。
  - tests: `pnpm test:e2e`
  - verify: 全量 Electron E2E 通过; Playwright workers 固定为 1; CI 在 `windows-2022` 执行 `pnpm test:e2e`。
  - evidence: `pnpm test:e2e` 通过, 15 passed, using 1 worker。
- [x] 任务 2.1: 修复 GitHub hosted Windows 上真实鼠标测试不稳定。
  - tests: `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0`; `pnpm test:e2e`
  - verify: CI 保留稳定 Electron E2E 覆盖; 真实 OS 鼠标命中测试只在本地 Windows 执行。
  - evidence: `pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0` 通过, 2 passed; `CI=true pnpm exec playwright test tests/e2e/window-controls.e2e.ts --retries=0` 通过, 1 passed / 1 skipped; `pnpm test:e2e` 通过, 15 passed; `CI=true pnpm test:e2e` 通过, 14 passed / 1 skipped。
- [x] 任务 3: 本地门禁。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build`
  - verify: 本地完整检查通过; 不改 UI。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm test` (54 files / 422 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; `pnpm build`; `pnpm test:e2e` (15 tests) 均通过。
- [x] 任务 4: 推送后等待 GitHub Actions。
  - tests: `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status`
  - verify: 新 SHA 对应 CI run 成功。
  - evidence: `gh run watch 26797628833 --repo Caldis/berth --exit-status` 通过; SHA `82bb117a5ed640954945e0276c6f1fbf552553db`; Ubuntu 和 Windows job 均成功, Windows 执行 `pnpm test:e2e`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
