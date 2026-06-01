# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 扩展 shared plugin contract, 声明健康检查 descriptor 字段。
  - tests: `pnpm vitest run tests/unit/agent-capability-plugins.test.ts`
  - verify: 类型不引入 `agent-plugin.ts` <-> `ipc.ts` 反向 import; 界面质量与交互验收不适用。
  - evidence: passed 2026-06-02, 10 tests.
- [x] 任务 2: 在内置 Claude Code / Codex plugin 中声明健康检查规则族 descriptor。
  - tests: `pnpm vitest run tests/unit/agent-capability-plugins.test.ts`
  - verify: 覆盖 hooks、config/settings、MCP、instructions、skills、agents、sessions; 不把运行时检查执行迁出 `health.ts`; 界面质量与交互验收不适用。
  - evidence: passed 2026-06-02, 10 tests.
- [x] 任务 3: 补齐 Settings renderer fixture, 确保新字段不改变当前 UI 行为。
  - tests: `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx`
  - verify: Settings 默认摘要不增加详情噪音, 展开详情与外链行为不变。
  - evidence: passed 2026-06-02, 3 tests.
- [x] 任务 4: 进入 verify 阶段前跑类型与 harness 目标检查。
  - tests: `pnpm typecheck`; `pnpm harness:check --work docs/works/2026-06-02-gh-26-agent-plugin-health-check-descriptors`
  - verify: 当前 work 产物合规, shared 类型全仓可用。
  - evidence: passed 2026-06-02.
- [ ] 任务 5: 修正 health descriptor i18n key, 避免冒号被 i18next 解析为 namespace。
  - tests: `pnpm vitest run tests/unit/agent-capability-plugins.test.ts`; `pnpm typecheck`
  - verify: descriptor `id` 保留冒号; `labelKey` / `descriptionKey` / `suggestionKey` 使用点分隔的安全 key; 界面质量与交互验收不适用。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

- 2026-06-02: code review 发现 descriptor i18n key 直接拼接冒号 id, i18next 默认会把冒号解析为 namespace 分隔符。已追加任务 5, phase 退回 implement。
