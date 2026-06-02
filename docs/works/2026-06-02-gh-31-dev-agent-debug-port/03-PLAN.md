# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 更新 `agent-dev-core` 单元测试, 覆盖端口解析、无效端口、spawn 参数、state 和格式化输出。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts` passed, 16 tests.
  - verify: 非 UI 任务。
- [x] 实现 `dev:agent start` 调试端口支持。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts` passed, 16 tests.
  - verify: 非 UI 任务。
- [ ] 更新 verify 工作流文案, 让 renderer 验收优先使用 `pnpm dev:agent start --debug-port <port>`。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-31-dev-agent-debug-port`
  - verify: 非 UI 任务。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
