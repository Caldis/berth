# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 补 Claude scanner 在 settings 缺失但 sidecar 存在时的 disabled Hook 行。
  - tests: `pnpm vitest run tests/unit/claude-scanner.test.ts` — 12 passed
  - verify: 先新增失败测试证明 settings 缺失时 hooks 为空; 修复后 user sidecar 能生成 disabled Hook asset, permissions/env 仍不从缺失 settings 派生。

- [ ] 任务 2: 删除恢复中心 UI 与 renderer 侧专用 API 使用。
  - tests: `pnpm vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: 左侧 rail 不再渲染 `hook-recovery-center`; 不调用 `window.api.hooks.recoveries`; Claude disabled Hook 仍在右侧显示 Disabled tag 和 Enable 按钮; Codex 行内启停不退化; 响应式/focus 使用现有行内按钮。

- [ ] 任务 3: 删除恢复中心 IPC/preload/shared type/main manager surface 与无用 i18n/mock。
  - tests: `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm vitest run tests/unit/hooks-manager.test.ts tests/unit/claude-scanner.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: `rg "HookRecovery|hooks:recoveries|clearRecovery|capabilities\\.hooks\\.recovery" src tests` 不再命中运行时代码或测试 mock; sidecar disable/restore 测试仍通过。

- [ ] 任务 4: 收口验证与真实 UI 检查。
  - tests: `pnpm harness:check --work docs/works/2026-06-04-gh-104-inline-claude-hook-restore`; `pnpm typecheck`; 目标测试全量重跑; 视情况跑 `pnpm harness:prepush`
  - verify: Electron Hooks 页实测左侧无恢复中心, Claude disabled Hook 可在右侧行内恢复; 记录截图或实测证据。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
