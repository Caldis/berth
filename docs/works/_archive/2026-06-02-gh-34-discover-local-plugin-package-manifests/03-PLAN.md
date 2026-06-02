# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 先补 manifest package discovery 单测。
  - tests: `pnpm test -- tests/unit/agent-plugin-manifest.test.ts`
  - verify: 测试先覆盖 explicit directory、home/project direct child package、`manifest.json` 优先于 `plugin.json`、duplicate id 顺序; 非 UI 任务, 界面验收不适用。
  - evidence: 新增 3 个单测, 初次运行 `pnpm test -- tests/unit/agent-plugin-manifest.test.ts` 失败 3 项, 复现目录 source 未展开的问题。
- [x] 任务 2: 实现目录 source discovery。
  - tests: `pnpm test -- tests/unit/agent-plugin-manifest.test.ts`
  - verify: 所有新增测试通过, 现有 explicit file/env/home/project JSON 行为不回退; 非 UI 任务, 界面验收不适用。
  - evidence: `pnpm test -- tests/unit/agent-plugin-manifest.test.ts` 通过, 16 tests passed。
- [x] 任务 3: 本地门禁。
  - tests: `pnpm lint`; `pnpm typecheck`; `pnpm test`; `pnpm harness:check`; `pnpm build`
  - verify: 本地完整检查通过; 非 UI 任务, 界面验收不适用。
  - evidence: `pnpm lint`; `pnpm typecheck`; `pnpm test` (54 files / 422 tests); `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`; `pnpm build` 均通过。
- [x] 任务 4: 推送后等待 GitHub Actions。
  - tests: `gh run list --branch master --limit 5`; `gh run watch <run-id> --exit-status`
  - verify: 新 SHA 对应 CI run 成功。
  - evidence: `gh run watch 26796909747 --exit-status` 通过, SHA `159c5cb7e3a2c4be4948fa5084fa35fe6aa61a47`; Ubuntu 和 Windows jobs 均成功。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
