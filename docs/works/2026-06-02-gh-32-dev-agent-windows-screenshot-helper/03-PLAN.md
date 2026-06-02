# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [ ] 更新 `agent-dev-core` 单元测试, 覆盖 screenshot CLI、进程识别、helper 调用和错误路径。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts`
  - verify: 非产品 UI 任务。
- [ ] 实现 `pnpm dev:agent screenshot` Windows helper。
  - tests: `pnpm test tests/unit/agent-dev-core.test.ts`
  - verify: runtime verify 真实 agent-owned 窗口截图。
- [ ] 归档对应 friction 并记录 verify 证据。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-32-dev-agent-windows-screenshot-helper`
  - verify: 非产品 UI 任务。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
