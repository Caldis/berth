# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 修 `agent-dev-core.test.ts` 的跨平台 fixture。
  - tests: `pnpm vitest run tests/unit/agent-dev-core.test.ts`
  - verify: 非 UI; 测试不再依赖硬编码 Windows repo root。
  - evidence: `pnpm vitest run tests/unit/agent-dev-core.test.ts tests/harness/sync.test.ts` 通过, 21 个 agent-dev-core 测试通过。
- [x] 任务 2: 修 `harness-sync` symlink target 分隔符比较。
  - tests: `pnpm vitest run tests/harness/sync.test.ts`
  - verify: 非 UI; Windows 上 `readlinkSync()` 返回反斜杠时仍判定同步。
  - evidence: `pnpm vitest run tests/unit/agent-dev-core.test.ts tests/harness/sync.test.ts` 通过, 6 个 harness-sync 测试通过。
- [x] 任务 3: 沉淀 push/CI 状态规则。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-35-ci-failures-cross-platform`
  - verify: 非 UI; friction 记录存在, workflow 中包含 push 前后 CI 检查规则。
  - evidence: `pnpm harness:check --work docs/works/2026-06-02-gh-35-ci-failures-cross-platform` 通过。
- [x] 任务 4: 全量本地检查。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`
  - verify: 非 UI; 本地完整检查通过。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm test` (54 files / 419 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; `pnpm build` 均通过。
- [ ] 任务 5: 推送后等待 GitHub Actions 结果。
  - tests: `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status`
  - verify: 非 UI; 新 SHA 对应 CI run 成功后才能继续后续功能任务。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
