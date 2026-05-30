# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 扩展 `HealthCheck` evidence/fix/target/confidence 契约并给现有检查补默认 target; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [x] 任务 2: 按官方文档修正 Claude/Codex 高误报规则并补 evidence/fix; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [x] 任务 3: Overview 展示 evidence/fix 并优先使用 `target.route`; verify: `pnpm test -- tests/renderer/overview-health-checks.test.tsx`。
- [x] 任务 4: 最终回归: `pnpm test -- tests/unit/health-check.test.ts`, `pnpm test -- tests/renderer/overview-health-checks.test.tsx`, `pnpm typecheck`; 若无关任务恢复则跑 `pnpm harness:check`。
- [ ] 后续任务 A: 等 settings scan directories 稳定后, 设计显式额外 agent home / WSL Codex home 配置。
- [ ] 后续任务 B: 单独设计 scanner/watcher/IPC/store 的 health check 增量刷新。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
