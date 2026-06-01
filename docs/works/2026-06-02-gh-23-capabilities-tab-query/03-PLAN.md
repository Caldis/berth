# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 为 Capabilities 页签 query 行为补 renderer 测试。
  - tests: `pnpm test -- tests/renderer/capabilities-guidance.test.tsx`
  - verify: 新测试先失败, 覆盖 `tab=hooks` 初始化、非法 query 回退、点击 Status Line 同步 query。
- [x] 任务 2: 实现 Capabilities 读取和同步 `tab` query 参数。
  - tests: `pnpm test -- tests/renderer/capabilities-guidance.test.tsx`
  - verify: 通过, 5 tests passed; UI 结构、信息密度、组件样式、文案不变, 交互只表现为页签选中态和 URL query 同步。
- [ ] 任务 3: 跑类型和 harness 验证, 更新 issue resolved 与归档。
  - tests: `pnpm typecheck:web`; `pnpm harness:check`
  - verify: 不需要额外截图 - 此任务不改视觉样式; renderer 测试已覆盖用户可见页签状态。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
