# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。

- [x] T1: `tests/e2e/window-controls.e2e.ts` beforeEach 首行加 `test.skip(process.platform !== 'win32', ...)` (移到 launchBerthApp 之前); afterEach 改为 `const launchedApp: ElectronApplication | undefined = app; if (launchedApp) await launchedApp.close()`。补注释说明 GH-139 根因。
  - tests: win32 本地 `pnpm test:e2e -- tests/e2e/window-controls.e2e.ts` **3 passed (5.6s)** 无回归。
  - verify: 不适用 (无 UI)。lint 干净; typecheck:test 干净 (先 `pnpm install` 同步 pull 带入的 @dnd-kit 依赖, 与本改动无关)。
- [x] T2: 已确认仅改 `tests/e2e/window-controls.e2e.ts`, 无产品代码。
  - tests: 不适用 (核对)。
  - verify: `git status --short` 排除 docs 后仅 `tests/e2e/window-controls.e2e.ts`。
- [ ] T3: push 后旁路跟踪 macOS CI `verify (macos-latest)` window-controls 不再 worker teardown timeout; windows/ubuntu 不回归。
  - tests: 远端 CI。
  - verify: `pnpm harness:ci:wait --sha <full-sha>` (子代理/旁路)。macOS-only flaky 由构造性修复 (非 win32 不启 app) + CI 绿确认; 单轮绿即满足结构性消除验证。

顺序: T1 → T2 (同文件) → T3 (推送后异步)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
