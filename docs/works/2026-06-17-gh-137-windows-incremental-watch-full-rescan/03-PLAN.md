# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] T1: `tests/e2e/incremental-watch.e2e.ts` before-poll 谓词加 `snap.id !== 'initial'` 条件 (与 seed 出现 AND), 并补注释说明: 必须等首扫 commit 后再捕获 before.id, 否则渐进 partial 会让 seed 在 id 仍 'initial' 时可见 (慢 runner 上 before.id 误捕获 'initial' → 首扫 commit 后 afterId 必不等)。
  - tests: 改动本身即被测 e2e。`pnpm test:e2e -- tests/e2e/incremental-watch.e2e.ts` 本地 windows 实机通过 (2.5s, 含 playwright retry=1)。测试文件改动不影响 out/ 应用产物, 无需 rebuild。
  - verify: 不适用 (无 UI)。本地绿。
- [x] T2: 已确认未触碰任何产品代码。改动名单仅 `tests/e2e/incremental-watch.e2e.ts` (+ 本任务 docs/works 文件)。
  - tests: 不适用 (核对动作)。
  - verify: `git status --short` 名单核对通过 (排除 docs 后仅测试文件); 产品不变量 `pnpm test -- tests/unit/agent-asset-runtime.test.ts` 40 passed (含 :1062 "keeps the snapshot id stable")。lint / typecheck:test 绿。
- [ ] T3: push 后由旁路异步跟踪 windows CI `verify (windows-2022)` 的 incremental-watch e2e 转绿, macOS/ubuntu 不回归 (4.0-verify 收口前消费成功结果)。
  - tests: 远端 CI。
  - verify: 旁路 `pnpm harness:ci:wait --sha <full-sha>` (子代理/旁路执行)。

顺序: T1 → T2 (同一文件改动 + 核对, 顺序); T3 推送后异步。无并行项 (单文件)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
