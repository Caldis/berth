# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 为 Overview 增加中文健康检查内容测试
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 测试先失败, 能捕获标题、说明、fix label/description 和 evidence label 漏翻。
  - evidence: 2026-06-02 目标测试先失败; `Unable to find an element with the text: Skill 缺少 SKILL.md`。
- [x] 任务 2: 实现共享健康检查 i18n helper 并接入 Overview
  - tests: `pnpm exec vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 中文 Overview 健康检查内容显示中文, 英文 fallback 不变。
  - evidence: 2026-06-02 Overview 目标测试通过, 1 file / 2 tests passed。
- [x] 任务 3: 接入 Hooks 生命周期 hover 详情并补测试
  - tests: `pnpm exec vitest run tests/renderer/hooks-lifecycle-view.test.tsx`
  - verify: Hooks hover 详情同样显示中文健康检查内容。
  - evidence: 2026-06-02 Hooks 目标测试通过, 1 file / 23 tests passed。
- [x] 任务 4: 收口检查
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 包含视觉验收与 GitHub Actions run 结果。
  - evidence: 2026-06-02 本地通过 `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test` (60 files / 444 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`。
  - evidence: 2026-06-02 视觉验收截图 `C:\Users\mail\AppData\Local\Temp\berth-gh56-health-i18n-overview.png`, Overview 健康检查标题、说明、建议和 evidence label 已显示中文。
  - evidence: GitHub Actions CI run 26808016661 passed for `a924389116917bcf4054ded649a19a34797329d5` on Ubuntu and Windows。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
