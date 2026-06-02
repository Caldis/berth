# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 增加 Advanced Mode switch 可访问名称测试。
  - tests: `pnpm vitest run tests/renderer/settings-page.test.tsx` 先失败, 2 个新增用例无法通过 role/name 查询空名称 switch。
  - verify: Testing Library 通过 role/name 查询英文与中文 switch。
- [x] 任务 2: 给 Settings `Toggle` 增加本地化名称并保持切换行为。
  - tests: `pnpm vitest run tests/renderer/settings-page.test.tsx` 通过, 6 tests passed。
  - verify: switch 点击后 `aria-checked` 与 localStorage 同步; 新增测试等待 Settings 异步区块收敛, 无 React act 警告。
- [x] 任务 3: 运行门禁并做 Settings 弹窗实测。
  - tests: `pnpm typecheck:web` 通过; `pnpm harness:check --work docs/works/2026-06-02-gh-73-advanced-mode-switch-label` 通过。
  - verify: Electron dev + Playwright CDP 确认 switch 可用 `role=switch` + `name=高级模式` 查询; 点击后 `aria-checked` 从 `false` 变为 `true`; 截图 `C:/Users/mail/AppData/Local/Temp/berth-gh73-settings-switch.png` 显示布局未新增可见文字。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
