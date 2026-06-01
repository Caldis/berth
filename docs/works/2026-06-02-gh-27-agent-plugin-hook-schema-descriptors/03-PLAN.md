# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。implement 阶段维护此清单。

- [x] 任务 1: 扩展 shared plugin contract, 声明 hook schema descriptor 类型。
  - tests: `pnpm vitest run tests/unit/agent-capability-plugins.test.ts`
  - verify: 不新增 IPC; 不引入 `agent-plugin.ts` 到 renderer-only 文件的运行时依赖问题; 界面质量与交互验收不适用。
- [x] 任务 2: 在内置 Claude Code / Codex plugin 中声明 hook event 和 handler schema。
  - tests: `pnpm vitest run tests/unit/agent-capability-plugins.test.ts`
  - verify: Claude 覆盖 29 个当前官方事件和 5 种 handler; Codex 覆盖当前 10 个事件, `command` runnable, `prompt` / `agent` parsed-only; 不改 parser / hooks-manager / health engine。
- [x] 任务 3: 补齐 Settings 和 Hooks renderer 兼容测试。
  - tests: `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: Settings 摘要不增加详情噪音; Hooks 生命周期侧栏、健康 hover、恢复中心、行级启用/禁用行为不变。
- [ ] 任务 4: 进入 verify 阶段前跑类型与 harness 目标检查。
  - tests: `pnpm typecheck`; `pnpm harness:check --work docs/works/2026-06-02-gh-27-agent-plugin-hook-schema-descriptors`
  - verify: 当前 work 产物合规, shared 类型全仓可用。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
