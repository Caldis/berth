# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 更新 CI workflow action major。
  - tests: `pnpm harness:check`
  - verify: `.github/workflows/ci.yml` 仅 action 版本变更, 项目 `node-version: 20` 不变。
  - evidence: `pnpm harness:check` 通过。
- [x] 任务 2: 本地检查。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build`
  - verify: 本地完整检查通过。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm test` (54 files / 419 tests); `pnpm harness:check`; `pnpm build` 均通过。
- [x] 任务 3: 推送后等待 GitHub Actions。
  - tests: `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status`
  - verify: 新 SHA 对应 CI run 成功。
  - evidence: `gh run watch 26796222524 --exit-status` 通过, SHA `ab89c0ed8dfe4510da03701fa3269b16f6d765a9`; CI step 已使用 `actions/checkout@v5`, `pnpm/action-setup@v6`, `actions/setup-node@v5`, 未再出现 Node 20 action runtime warning。Windows runner label notice 为独立问题, 另行记录。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
