# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加 i18n 初始化语言解析测试。
  - tests: `pnpm exec vitest run tests/renderer/i18n-initial-language.test.ts`
  - verify: 覆盖 `berth-language=zh`、`berth-language=en`、非法值回退、缺失值回退。
  - evidence: `pnpm exec vitest run tests/renderer/i18n-initial-language.test.ts` 通过, 1 file / 4 tests。
- [x] 任务 2: 实现初始化读取保存语言。
  - tests: `pnpm exec vitest run tests/renderer/i18n-initial-language.test.ts`
  - verify: 不改设置页布局; 不新增文案; 保存语言优先级生效。
  - evidence: `pnpm exec vitest run tests/renderer/i18n-initial-language.test.ts` 通过, 保存语言优先于系统语言。
- [x] 任务 3: 跑目标设置页测试和标准门禁。
  - tests: `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx`; `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`
  - verify: 设置页现有行为不退化, harness 结构合法。
  - evidence: `pnpm exec vitest run tests/renderer/settings-agent-plugins.test.tsx` 通过, 1 file / 9 tests; `pnpm lint`; `pnpm typecheck`; `pnpm harness:check`; `pnpm test` 55 files / 428 tests; `pnpm build`; `pnpm test:e2e` 15 tests 均通过。
- [x] 任务 4: 推送前确认最近 CI 状态, 推送后等待新 SHA 的 GitHub Actions。
  - tests: `gh run list --repo Caldis/berth --branch master --limit 5`; `gh run watch <run-id> --repo Caldis/berth --exit-status`
  - verify: 本地通过且远端 CI 通过后再继续后续任务。
  - evidence: 推送前最近 master CI 为 success; `gh run watch 26798646644 --repo Caldis/berth --exit-status` 通过, SHA `5771702545c3574a25d65ba64ae5ec51919b2cf8`, Ubuntu 和 Windows job 均成功。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
