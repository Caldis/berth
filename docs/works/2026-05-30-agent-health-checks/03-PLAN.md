# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 扩展 `HealthCheck` IPC 类型与 `runHealthChecks` options, 增加基础分组字段; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [x] 任务 2: 引入结构化 TOML parser, 增加 Codex config/custom agent parser; verify: 新增/更新 Codex parser 单测。
- [x] 任务 3: 扩展 Codex adapter 扫描 config、hooks、AGENTS.md、agents、skills 和 sessions; verify: `pnpm test -- tests/unit/codex-adapter.test.ts`。
- [x] 任务 4: 修正 Claude subagent Markdown frontmatter 扫描和解析; verify: `pnpm test -- tests/unit/claude-scanner.test.ts`。
- [ ] 任务 5: 完成 health engine 检查项: source/syntax/structure/reference/configuration/session; verify: `pnpm test -- tests/unit/health-check.test.ts`。
- [ ] 任务 6: 更新 `assets:health-check` IPC, 复用 scanner assets/errors; verify: 相关 unit/renderer 测试通过。
- [ ] 任务 7: 更新 Overview 健康检查 UI, 展示 info/warning/error、agent 分组、path 点击; verify: `pnpm test -- tests/renderer/overview-health-checks.test.tsx`。
- [ ] 任务 8: 更新 `docs/user-manual.md` 与任务态清单; verify: `pnpm harness:check`。
- [ ] 任务 9: 最终回归: `pnpm test -- tests/unit/health-check.test.ts tests/unit/codex-adapter.test.ts tests/unit/claude-scanner.test.ts`, `pnpm test -- tests/renderer/overview-health-checks.test.tsx`, `pnpm typecheck`, `pnpm harness:check`, `pnpm lint`, `pnpm build`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
