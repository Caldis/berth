# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 主进程 All 口径回归测试
  - 在 `tests/unit/usage-summary.test.ts` 增加 `days: 0` 全量累计测试, 先确认当前实现通过或失败状态。
  - 验证: `pnpm test -- tests/unit/usage-summary.test.ts` 通过, 11 tests passed。
- [x] 任务 2: Renderer 默认 All 与时间范围交互
  - 在 `tests/renderer/sessions-pages.test.tsx` 更新默认请求断言, 并覆盖 30 天与 All 按钮传参。
  - 先跑测试看到当前实现失败, 再改 `src/renderer/src/pages/usage.tsx`。
  - 验证: `pnpm test -- tests/renderer/sessions-pages.test.tsx` 先按预期失败, 修复后通过, 16 tests passed。
- [x] 任务 3: 阶段收口
  - 跑目标测试、web/node typecheck、harness check。
  - 更新本清单和 INDEX.phase 到 verify。
  - 验证: `pnpm test -- tests/unit/usage-summary.test.ts tests/renderer/sessions-pages.test.tsx` 通过, 27 tests passed; `pnpm typecheck:web` 通过; `pnpm typecheck:node` 通过; `pnpm harness:check` 通过。

## verify 回写

全部通过:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (48 files, 297 tests passed; 存在既有 jsdom/Recharts 0 宽高 stderr 警告, exit code 0)
- `pnpm build`
- Playwright Electron renderer 验收: 启动构建后的 `out/main/index.js`, 使用独立 `--berth-agent-instance`, 验证 Usage 默认选中 `All time` / `全部`, 点击 `近 30 天` 后可切回 `全部`。截图: `C:\Users\mail\AppData\Local\Temp\berth-usage-cost-playwright.png`

补充记录:

- Windows 系统截图脚本在 verify 阶段暴露两个流程摩擦: PowerShell `$PID` 为只读自动变量, 以及 `CopyFromScreen` 受前台遮挡影响。已记录到 `docs/friction/20260601-verify-windows-screenshot-verification.md`。

verify 不通过项作为新任务追加于此, phase 退回 implement。
