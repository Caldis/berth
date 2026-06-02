# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 为 Settings 外观选项补齐 radiogroup / radio 语义、checked state 和方向键行为。
  - tests: `pnpm vitest run tests/renderer/settings-page.test.tsx` (pass, 4 tests)
  - verify: Theme/Language 组可通过 role 查询; 点击与方向键后 selected state 更新; 布局 class 不做无关调整。
- [x] 任务 2: 补 renderer 测试, 覆盖语义、点击、方向键和本地存储。
  - tests: `pnpm vitest run tests/renderer/settings-page.test.tsx` (pass, 4 tests)
  - verify: 测试能在 ThemeProvider 下验证真实主题状态; 语言切换后 `berth-language` 写入 `localStorage`。
- [x] 任务 3: 跑局部与提交前门禁。
  - tests: `pnpm vitest run tests/renderer/settings-page.test.tsx` (pass, 4 tests); `pnpm typecheck:web` (pass); `pnpm harness:check --work docs/works/2026-06-02-gh-65-settings-appearance-radio-semantics` (pass); `pnpm harness:prepush` (pass, 61 files / 464 tests); `pnpm harness:ci:wait -- --timeout 300 --poll 3` (pass, CI#26815776638 on e8b7dd2)
  - verify: 本地目标测试通过; harness task 状态合法; 推送前 baseline 为绿; 推送后 Windows 与 Ubuntu CI 均通过。真实 UI 验收使用 agent-owned Electron `gh65-settings-radio`, CDP 断言 Settings dialog 内 Theme/Language radiogroup 与方向键切换, 并保存窗口截图到 `%TEMP%\berth-gh65-settings-radio-window.png`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
