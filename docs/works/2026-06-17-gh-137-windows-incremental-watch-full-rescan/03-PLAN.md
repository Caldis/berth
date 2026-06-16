# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] T1: `tests/e2e/incremental-watch.e2e.ts` before-poll 谓词加 `snap.id !== 'initial'` 条件 (与 seed 出现 AND), 并补注释说明: 必须等首扫 commit 后再捕获 before.id, 否则渐进 partial 会让 seed 在 id 仍 'initial' 时可见 (慢 runner 上 before.id 误捕获 'initial' → 首扫 commit 后 afterId 必不等)。
  - tests: 改动本身即被测 e2e。`pnpm test:e2e -- tests/e2e/incremental-watch.e2e.ts` 本地 windows 实机通过 (2.5s, 含 playwright retry=1)。测试文件改动不影响 out/ 应用产物, 无需 rebuild。
  - verify: 不适用 (无 UI)。本地绿。
- [x] T2: 已确认未触碰任何产品代码。改动名单仅 `tests/e2e/incremental-watch.e2e.ts` (+ 本任务 docs/works 文件)。
  - tests: 不适用 (核对动作)。
  - verify: `git status --short` 名单核对通过 (排除 docs 后仅测试文件); 产品不变量 `pnpm test -- tests/unit/agent-asset-runtime.test.ts` 40 passed (含 :1062 "keeps the snapshot id stable")。lint / typecheck:test 绿。
- [x] T3: push 后旁路跟踪 windows CI 转绿。
  - tests: 远端 CI。
  - verify: SHA `3c012baa` → run 27632710696, **`verify (windows-2022)` 全绿 5m21s (含 `pnpm test:e2e` ✓, job 81711691003)** —— windows incremental-watch e2e 由红转绿, 修复确认生效。

## verify 回写
- **windows (任务目标): PASS** —— CI run 27632710696 windows-2022 job 全步骤绿。AC1-4 满足 (AC5 design 已丢弃为冗余)。
- **macOS run-level 红 = 不相关已知 flaky**: `verify (macos-latest)` 报 "Worker teardown timeout of 30000ms exceeded" (失败 worker 跑了 23 个测试, incremental-watch 只是被列入清单, 非其断言失败; 实际错误在 window-hardening:23 但根因是 worker teardown 超时)。归因: 即 active issue [[2026-06-11-BUG-e2e-window-controls-teardown-flaky-macos]] (近期已 3 次复发追记), macOS-only, 与本提交无关 (本任务只改 incremental-watch.e2e.ts, macOS 上该测试行为不变)。invariant 11 归因 → 记录交叉引用, 不在 GH-137 范围内追修。

顺序: T1 → T2 (同一文件改动 + 核对, 顺序); T3 推送后异步。无并行项 (单文件)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
