# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加中文 Overview 技能统计标签测试
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 测试先失败, 能捕获 `Skills` 漏翻。
  - evidence: 2026-06-02 目标测试 1 failed / 1 passed; `Unable to find an element with the text: 技能`, DOM 中仍为 `Skills`。
- [x] 任务 2: 修正中文资源
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 中文 Overview 显示 `技能`, 不显示 `Skills`。
  - evidence: 2026-06-02 目标测试通过, 1 file / 2 tests passed。
- [x] 任务 3: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 包含 GitHub Actions run 结果。
  - evidence: 2026-06-02 本地通过 `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test` (60 files / 443 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`。
  - evidence: 2026-06-02 视觉验收截图 `C:\Users\mail\AppData\Local\Temp\berth-gh55-overview-verify.png`, Overview 统计卡显示 `技能`, 未显示 `Skills`。
  - evidence: GitHub Actions CI run 26806931329 passed for `13b8281b96d04d6ad0418a72b9aaafc98eb3927c` on Ubuntu and Windows。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

旁支问题:
- `docs/issues/2026-06-02-BUG-localize-health-check-content.md`: 中文 Overview 健康检查内容仍有英文, 不属于 GH-55 的统计标签修复范围。
