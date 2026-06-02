# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 写 manifest validator 目标测试, 覆盖权限明细、策略字段、blocked 状态和 invalid 不返回伪权限。
  - tests: `pnpm vitest run tests/unit/agent-plugin-manifest.test.ts`
  - verify: 非 UI 任务; 目标测试已先失败于 `entry.permissions` 缺失, 实现后 13 tests passed。
- [x] 任务 2: 实现 manifest permission 共享类型和 parser 返回值。
  - tests: `pnpm vitest run tests/unit/agent-plugin-manifest.test.ts`
  - verify: 非 UI 任务; `write` / `execute` 仍 blocked, `status === invalid` 不返回 `permissions`; 13 tests passed。
- [ ] 任务 3: 写 Settings renderer 目标测试, 覆盖默认摘要无噪音、展开后显示权限审查、invalid manifest 不显示伪权限。
  - tests: `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx`
  - verify: 界面质量与交互验收: 摘要不新增权限路径; 展开后可见 kind / scope / path / reason / strategy; validation errors 保持可见。
- [ ] 任务 4: 实现 Settings manifest 权限审查 UI 与中英文 i18n。
  - tests: `pnpm vitest run tests/renderer/settings-agent-plugins.test.tsx`
  - verify: 界面质量与交互验收: 复用现有 badge、mono path、border/divide; 第三方 reason 原文展示; 缺失策略显示未声明; 不增加弹层或 hover 依赖。
- [ ] 任务 5: 更新计划状态并推进 verify。
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-33-manifest-permission-review`
  - verify: 当前任务文档合规; INDEX.phase 改为 verify。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
