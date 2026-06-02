# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 先补短 SHA 失败用例。
  - tests: `pnpm vitest run tests/harness/ci-gate.test.ts` (fail before implementation: short SHA does not match full `headSha`)
  - verify: 现有精确匹配测试仍在, 新增短 SHA 匹配和 retry 断言。
- [x] 任务 2: 修改 CI wait run 匹配逻辑。
  - tests: `pnpm vitest run tests/harness/ci-gate.test.ts` (pass, 12 tests); `pnpm typecheck:node` (pass)
  - verify: short SHA 和 full SHA 都能匹配, 非匹配前缀返回 null。第一次实现只改了本地 headSha 前缀匹配, 实测 `gh run list --commit <short-sha>` 仍拿不到 run; 已补 `git rev-parse <sha>` 先解析完整 SHA。
  - manual: `pnpm harness:ci:wait -- --sha 01e1fb2 --timeout 120 --poll 3` (pass, matched `CI#26820370676`)
- [x] 任务 3: 跑 harness 检查、prepush、推送并等待 CI, 然后归档。
  - tests: `pnpm harness:prepush` (pass, 64 files / 481 tests)
  - verify: push 前检查 CI baseline; implementation commit `01e1fb2` CI `26820370676` pass, but short SHA wait still failed; final commit `bb92339` CI `26820782051` pass.
  - manual: `pnpm harness:ci:wait -- --sha 01e1fb2 --timeout 120 --poll 3` (pass after final fix, matched `CI#26820370676`); `pnpm harness:ci:wait -- --sha bb92339 --timeout 120 --poll 3` (pass, matched `CI#26820782051`)

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
