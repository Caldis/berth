# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [ ] 任务 1: 先更新 renderer 测试, 固定要保留/删除的 UI 行为
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 先应能暴露旧实现与新预期不一致, 实现后通过
- [ ] 任务 2: 精简 `HooksLifecycleView` 功能区和密度参数
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`
- [ ] 任务 3: 调整生命周期索引为桌面 sticky 侧栏, 小屏保留横向索引
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`
- [ ] 任务 4: 收口验证
  - tests: target renderer test, `pnpm typecheck:web`, `pnpm harness:check`
  - verify: 上述命令全部通过; 如启动 dev 做 UI 目视检查, 记录地址和结果

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
