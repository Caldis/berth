# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 更新 `agent-dev-core` 单元测试, 覆盖 screenshot CLI、进程识别、helper 调用和错误路径。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts` passed, 21 tests.
  - verify: 非产品 UI 任务。
- [x] 实现 `pnpm dev:agent screenshot` Windows helper。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts` passed, 21 tests; `pnpm lint` passed.
  - verify: runtime verify 真实 agent-owned 窗口截图。
- [x] 归档对应 friction 并记录 verify 证据。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-32-dev-agent-windows-screenshot-helper` passed.
  - verify: 非产品 UI 任务。

## verify 回写

Implement smoke test passed:

- `pnpm dev:agent start --id gh32-screenshot-smoke --debug-port 9338 --json` started pid 477988.
- `pnpm dev:agent screenshot gh32-screenshot-smoke --json` wrote `C:\Users\mail\AppData\Local\Temp\berth-agent-dev\gh32-screenshot-smoke\screenshot.png`.
- Screenshot metadata: Electron pid 304756, handle `0xc1280`, bounds `960,399,1920x1290`, file size 130256 bytes.
- Visual inspection confirmed the PNG captured the real Berth overview window and was nonblank.
- `pnpm dev:agent stop gh32-screenshot-smoke --json` stopped pid 477988.
- `pnpm dev:agent guard after --id gh32-screenshot-smoke --json` returned `guard-ok`, `restarted: []`.
