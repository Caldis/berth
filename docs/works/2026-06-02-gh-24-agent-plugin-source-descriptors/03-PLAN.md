# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

## 实现项

- [ ] 扩展 Agent Capability Plugin source descriptor 类型与 registry 元数据。
  - tests: `tests/unit/agent-capability-plugins.test.ts`
  - verify: `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts`
- [ ] 将运行时 source coverage 与 descriptor 按 `code` 对齐, 并保留 scanner 通用项目候选。
  - tests: `tests/unit/agent-capability-plugins.test.ts`
  - verify: `pnpm exec vitest run tests/unit/agent-capability-plugins.test.ts`
- [ ] 更新 Settings renderer fixture, 确认插件列表与展开详情不退化。
  - tests: `tests/renderer/settings-agent-plugins.test.tsx`
  - verify: `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx`
  - UI/UX: 默认视图不新增平铺来源说明, 展开详情仍保持轻量信息密度。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
