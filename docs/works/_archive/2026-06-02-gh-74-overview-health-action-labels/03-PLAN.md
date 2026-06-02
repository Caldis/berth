# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 将 Overview health check action 测试改为 role/name 查询, 并要求显式 `aria-label`。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` 初次只改 role/name 时通过, 说明 `title` 会作为兜底名称; 补 `aria-label` 属性断言后失败, 证明当前按钮缺少显式标签。
  - verify: 英文/中文测试都通过 accessible name 查询按钮, 并检查 `aria-label` 与 `title` 一致。
- [x] 任务 2: 给 ignore info 和 copy fix snippet 图标按钮补本地化 `aria-label`。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` 通过, 4 tests passed。
  - verify: 复制和忽略行为保持原样。
- [x] 任务 3: 运行门禁并做 Overview 实测。
  - tests: `pnpm typecheck:web` 通过; `pnpm harness:check --work docs/works/2026-06-02-gh-74-overview-health-action-labels` 通过。
  - verify: Electron dev + CDP 确认真实 Overview 中 `忽略信息检查` / `复制修复片段` 按钮均有 `aria-label` 与 `title`; 截图 `C:/Users/mail/AppData/Local/Temp/berth-gh74-overview-health-actions.png` 显示布局未新增可见文字。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
