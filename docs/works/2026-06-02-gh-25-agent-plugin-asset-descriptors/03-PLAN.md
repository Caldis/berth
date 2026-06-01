# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

## 实现项

- [x] 扩展 Agent Capability Plugin asset descriptor 类型与内置 registry 元数据。
  - tests: `tests/unit/agent-capability-plugins.test.ts`
  - verify: `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts` (passed, 8 tests)
- [x] 更新 Settings renderer fixture, 确认插件列表和展开详情不退化。
  - tests: `tests/renderer/settings-agent-plugins.test.tsx`
  - verify: `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx` (passed, 3 tests); `pnpm typecheck` passed
  - UI/UX: 默认视图不新增资产清单; 展开详情保持当前信息密度。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
