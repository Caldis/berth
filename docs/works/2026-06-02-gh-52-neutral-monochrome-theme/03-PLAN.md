# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加主题 palette 回归测试
  - tests: `pnpm exec vitest run tests/renderer/theme-palette.test.ts`
  - verify: 测试先失败, 能捕获旧橙色 accent/chart token 和 Usage 硬编码 palette
  - evidence: 2026-06-02 目标测试先失败, 2 tests failed; 当前 CSS 仍为 `--accent: 24.6 95% 53.1%`, Usage 仍硬编码 `hsl(24.6, 95%, 53.1%)`。
- [x] 任务 2: 更新主题 token 和 Usage palette
  - tests: `pnpm exec vitest run tests/renderer/theme-palette.test.ts`
  - verify: 不改布局、不改 DOM; 旧橙色不再作为全局 accent 或 Usage palette
  - evidence: 2026-06-02 `pnpm exec vitest run tests/renderer/theme-palette.test.ts` 通过, 2 tests passed。
- [ ] 任务 3: 本地检查与界面截图
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 包含本地截图验收和 GitHub Actions run 结果
  - evidence: 2026-06-02 本地检查通过: `pnpm lint`; `pnpm typecheck:web`; `pnpm test` (59 files, 441 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`。
  - evidence: `pnpm dev:agent start --id neutral-theme-verify --debug-port 9340` 后用 `print-window` 截图验证 Usage 页; dark active 状态为白底近黑字 `rgb(250,250,250)` / `rgb(9,9,11)`, light active 状态为近黑底白字 `rgb(24,24,27)` / `rgb(250,250,250)`。
  - pending: GitHub Actions run 结果待 push 后回写。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
