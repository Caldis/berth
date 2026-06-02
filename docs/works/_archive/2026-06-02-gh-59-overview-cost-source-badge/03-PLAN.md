# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 为 Overview 费用卡增加来源 badge 和可访问说明。
  - tests: `pnpm vitest run tests/renderer/overview-health-checks.test.tsx` — 4 passed
  - verify: 费用卡 header 显示来源 badge; unknown 时金额仍为 `—`; `title` / `aria-label` 说明本地扫描和价格表估算可能不同于供应商账单; 布局保持紧凑, 图表不被新说明挤压。
- [x] 任务 2: 确认 Usage 费用说明未被破坏, 并完成类型检查。
  - tests: `pnpm vitest run tests/renderer/usage-tooltip-label.test.tsx` — 1 passed; `pnpm typecheck:web` — passed
  - verify: Usage 页现有费用 tooltip/说明仍通过; Overview 新文案不出现 raw enum。
- [x] 任务 3: 完成真实界面截图、全局检查、归档。
  - tests: `pnpm lint` — passed; `pnpm typecheck:web` — passed; `pnpm typecheck:node` — passed; `pnpm test` — 60 files / 446 tests; `pnpm harness:check` — passed; `node scripts/harness-projects.mjs check --strict` — passed
  - verify: 使用独立 `dev:agent` 实例在 zh/dark Overview 截图, 费用卡显示“混合”和金额且不重叠。Renderer 截图: `C:\Users\mail\AppData\Local\Temp\berth-gh59-overview-cost-source.png`; Electron 窗口截图: `C:\Users\mail\AppData\Local\Temp\berth-gh59-overview-cost-source-window.png`。实现提交 push 前当前分支 Actions 为 success, push 后 `26811361258` 在 Ubuntu 与 Windows 均 success。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
