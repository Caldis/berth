# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 确认 hooks lifecycle 行首 badge 的真实渲染路径。
  - tests: 不适用
  - verify: 已读 `HookAssetRow` 与 `hookDisplayDetails`
- [x] 任务 2: 确认可直接使用 `AgentCapabilityPluginHookHandlerDescriptor.labelKey`。
  - tests: 不适用
  - verify: 已读 `findHookHandlerDescriptor`
- [x] 任务 3: 在行首 badge 使用可读 label，并保留原始 type 回退。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: badge 仍在原位，JSON 原文仍可展开
- [x] 任务 4: 补齐内置 handler label 的中英文 i18n。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 英文/中文翻译 key 不缺失
- [x] 任务 5: 跑目标测试、typecheck 和 harness check。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`; `pnpm typecheck:web`; `pnpm harness:check --work docs/works/2026-06-02-gh-60-hooks-readable-handler-type-labels`
  - verify: 已通过

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

## verify 记录
- `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx` — 24 tests passed
- `pnpm typecheck:web` — passed
- `pnpm harness:check --work docs/works/2026-06-02-gh-60-hooks-readable-handler-type-labels` — passed
