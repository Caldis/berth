# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: Codex 单 hook 启停
  - 范围: `hooks.state` 读写、hook key、IPC、row toggle、相关文案。
  - 验证: `pnpm vitest run tests/unit/codex-config-parser.test.ts tests/unit/hooks-manager.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`; `pnpm typecheck`; `pnpm harness:check`。
- [x] 任务 2: 入口文件识别增强
  - 范围: Claude / Codex command path 提取, 支持项目根、home、常用变量。
  - 验证: parser 单测 + hook lifecycle open action 单测。
- [x] 任务 3: 生命周期对照模式
  - 范围: 页面内 lifecycle/comparison 切换, 按 Agent 视角隐藏无关列。
  - 验证: renderer 单测覆盖 all/claude/codex。
- [x] 任务 4: 配置风险提示
  - 范围: row 级风险标签, 不写配置。
  - 验证: lifecycle 单测 + renderer 单测。
- [x] 任务 5: 用户级 / 项目级开关分开
  - 范围: Agent 级开关按 scope 展示, user 可写, project 不可写时说明原因。
  - 验证: hooks-manager 单测 + renderer 单测。
- [x] 任务 6: 页面密度优化
  - 范围: comfortable/compact 切换, 长命令可读。
  - 验证: renderer 单测。
- [ ] 任务 7: Hook 健康检查入口
  - 范围: 顶部 hook 检查摘要与跳转。
  - 验证: renderer 单测 + 现有 health 单测。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

## implement 回写

- 任务 1: 已通过相关 Vitest、`pnpm typecheck`、`pnpm harness:check`。
- 任务 2: 已通过 `pnpm vitest run tests/unit/claude-scanner.test.ts tests/unit/codex-config-parser.test.ts tests/unit/hook-lifecycle.test.ts`、`pnpm typecheck`、`pnpm harness:check`。
- 任务 3: 已通过 `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx tests/unit/hook-lifecycle.test.ts`、`pnpm typecheck`、`pnpm harness:check`。
- 任务 4: 已通过 `pnpm vitest run tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`、`pnpm typecheck`、`pnpm harness:check`。
- 任务 5: 已通过 `pnpm vitest run tests/unit/hooks-manager.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`、`pnpm typecheck`、`pnpm harness:check`。
- 任务 6: 已通过 `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`、`pnpm typecheck`、`pnpm harness:check`。
