# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 补 MemoryView renderer 测试, 覆盖详情区过渡标记、收起隐藏和关联跳转高亮自动清除。
  - tests: `pnpm test -- tests/renderer/memory-view.test.tsx`
  - verify: 通过, 3 tests passed。断言详情区 wrapper 的 grid rows 状态, 断言 timer 后 focus class 消失。
- [x] 任务 2: 实现详情区 grid rows 过渡与 focus timer 清理。
  - tests: `pnpm test -- tests/renderer/memory-view.test.tsx`
  - verify: 通过, 3 tests passed。不新增可见说明文案; 只改善展开/跳转反馈。
- [ ] 任务 3: 运行 web 类型检查和 harness 检查, 更新任务状态。
  - tests: `pnpm typecheck:web`; `pnpm harness:check`
  - verify: `pnpm typecheck:web` 已通过; `pnpm harness:check` 待 Project 配额恢复并写入 item_id 后执行。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
