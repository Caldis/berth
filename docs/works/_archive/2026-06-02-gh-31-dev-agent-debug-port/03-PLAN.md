# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 更新 `agent-dev-core` 单元测试, 覆盖端口解析、无效端口、spawn 参数、state 和格式化输出。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts` passed, 17 tests.
  - verify: 非 UI 任务。
- [x] 实现 `dev:agent start` 调试端口支持。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts` passed, 17 tests.
  - verify: 非 UI 任务。
- [x] 更新 verify 工作流文案, 让 renderer 验收优先使用 `pnpm dev:agent start --debug-port <port>`。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-31-dev-agent-debug-port` passed.
  - verify: 非 UI 任务。

## verify 回写

2026-06-02 verify passed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` passed, 54 files / 414 tests; Recharts zero-size warnings are pre-existing renderer test noise.
- `pnpm harness:check`
- `node scripts/harness-projects.mjs check --strict`
- Runtime check:
  - `pnpm dev:agent guard before --id gh31-debug-port-verify --json` recorded 2 protected user dev processes.
  - `pnpm dev:agent start --id gh31-debug-port-verify --debug-port 9337 --json` returned `debugPort: 9337` and `devtoolsUrl: http://127.0.0.1:9337`.
  - `pnpm dev:agent status gh31-debug-port-verify --json` showed owned command line with `--remote-debugging-port=9337`.
  - `http://127.0.0.1:9337/json/version` returned `webSocketDebuggerUrl`.
  - `pnpm dev:agent stop gh31-debug-port-verify --json` stopped pid 182692.
  - `pnpm dev:agent guard after --id gh31-debug-port-verify --json` returned `guard-ok`, `restarted: []`.
