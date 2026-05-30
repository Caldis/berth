# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 扩展 `HealthCheck` evidence/fix/target/confidence 契约并给现有检查补默认 target; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [x] 任务 2: 按官方文档修正 Claude/Codex 高误报规则并补 evidence/fix; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [x] 任务 3: Overview 展示 evidence/fix 并优先使用 `target.route`; verify: `pnpm test -- tests/renderer/overview-health-checks.test.tsx`。
- [x] 任务 4: 最终回归: `pnpm test -- tests/unit/health-check.test.ts`, `pnpm test -- tests/renderer/overview-health-checks.test.tsx`, `pnpm typecheck`; 若无关任务恢复则跑 `pnpm harness:check`。
- [x] 任务 5: 补官方 schema 与配置发现提示, 包括 Codex config schema 注释、Claude settings `$schema`、Claude 项目 AGENTS.md import 建议; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [x] 任务 6: 扫描范围补显式额外 agent home / WSL Codex home 配置, 优先支持 env 显式传入, 不自动猜路径; verify: adapter / watcher / health 单测。
- [x] 任务 7: 增量刷新 health checks, watcher 变更后重新扫描并通知 renderer 更新首页; verify: renderer hook 单测。
- [x] 任务 8: Overview evidence 官方文档链接可点击打开; verify: renderer health checks 单测。
- [ ] 任务 9: 低风险 fix snippet 支持复制, 先不自动写用户配置; verify: renderer health checks 单测。
- [ ] 任务 10: 降噪与忽略规则, 支持按 check id + path 忽略 info 级建议; verify: renderer health checks 单测。
- [ ] 任务 11: 增加 Claude Code / Codex 兼容提示, 明确哪些配置只对某一工具生效; verify: health 单测与 overview 渲染单测。

## verify 回写
- 2026-05-30: 任务 5 已通过 `pnpm test -- tests/unit/health-check.test.ts` 与 `pnpm typecheck`。后续任务 A/B 仍作为独立改进项保留。
- 2026-05-31: 任务 6 已通过 `pnpm test -- tests/unit/codex-adapter.test.ts tests/unit/claude-code-adapter.test.ts tests/unit/watcher.test.ts tests/unit/health-check.test.ts` 与 `pnpm typecheck:node`。完整 `pnpm typecheck` 被既有未提交 `src/renderer/src/pages/capabilities.tsx` 的 TS6133 挡住。
- 2026-05-31: 任务 7 已通过 `pnpm test -- tests/renderer/use-health-checks.test.tsx tests/renderer/overview-health-checks.test.tsx` 与 `pnpm typecheck:node`。`pnpm typecheck:web` 仍被既有未提交 `src/renderer/src/pages/capabilities.tsx` 的 TS6133 挡住。
- 2026-05-31: 任务 8 已通过 `pnpm test -- tests/renderer/overview-health-checks.test.tsx`。
- verify 不通过项作为新任务追加于此, phase 退回 implement。
