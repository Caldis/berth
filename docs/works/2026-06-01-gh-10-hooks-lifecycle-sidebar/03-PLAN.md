# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 先更新 renderer 测试, 固定要保留/删除的 UI 行为
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 旧实现下 `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 失败 3 项; 实现后 14 项通过
- [x] 任务 2: 精简 `HooksLifecycleView` 功能区和密度参数
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过
- [x] 任务 3: 调整生命周期索引为桌面 sticky 侧栏, 小屏保留横向索引
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过
- [x] 任务 4: 收口验证
  - tests: target renderer test, `pnpm typecheck:web`, `pnpm harness:check`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 14 项通过; `pnpm lint` 通过; `pnpm typecheck` 通过; `pnpm test` 50 个文件 / 324 项通过; `pnpm harness:check` 通过; `pnpm dev:agent start --id hooks-sidebar-verify --json` 启动 agent-owned Electron, PID 242052, 截图确认 Hooks 顶部无密度切换和全部禁用入口, 下滚后左侧生命周期索引保持 sticky, 最后 `pnpm dev:agent stop hooks-sidebar-verify --json` 已停止。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- [x] 任务 5: 调整生命周期侧栏信息层级与阶段建议操作
  - feedback: 左侧 Hook 数量改为数字 tag, 副标题展示阶段简短说明; 右侧长段 guide 改为 “建议操作” + 短标签。
  - tests: `tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` 15 项通过
- [x] 任务 6: 对照 Claude Code / Codex 官方 Hooks reference 固定完整事件分类
  - source: https://code.claude.com/docs/en/hooks; https://developers.openai.com/codex/hooks
  - tests: `tests/unit/hook-lifecycle.test.ts`
  - verify: `pnpm test -- tests/unit/hook-lifecycle.test.ts` 14 项通过
