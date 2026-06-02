# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [ ] 任务 1: 为 Overview 费用卡增加来源 badge 和可访问说明。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx`
  - verify: 费用卡 header 显示来源 badge; unknown 时金额仍为 `—`; `title` / `aria-label` 说明本地扫描和价格表估算可能不同于供应商账单; 布局保持紧凑, 图表不被新说明挤压。
- [ ] 任务 2: 确认 Usage 费用说明未被破坏, 并完成类型检查。
  - tests: `pnpm vitest run tests/renderer/usage-tooltip-label.test.tsx`; `pnpm typecheck:web`
  - verify: Usage 页现有费用 tooltip/说明仍通过; Overview 新文案不出现 raw enum。
- [ ] 任务 3: 完成真实界面截图、全局检查、归档。
  - tests: `pnpm lint`; `pnpm typecheck:web`; `pnpm typecheck:node`; `pnpm test`; `pnpm harness:check`; `node scripts/harness-projects.mjs check --strict`
  - verify: 使用独立 `dev:agent` 实例在 zh/dark Overview 截图, 确认 badge 和金额不重叠; push 前当前分支 Actions 为 success, push 后等待本 SHA CI 通过。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
