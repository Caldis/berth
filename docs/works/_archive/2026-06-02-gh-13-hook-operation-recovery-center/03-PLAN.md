# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 建立恢复点 IPC 契约、preload 暴露和测试 mock。
  - tests: `pnpm typecheck:node`, `pnpm typecheck:web`
  - verify: `8457025` 已接入 shared IPC 类型、main handler、preload wrapper 和 renderer mock; `pnpm typecheck:node`、`pnpm typecheck:web` 通过。
- [x] 任务 2: 实现 Claude sidecar 恢复点枚举与清理。
  - tests: `pnpm test -- tests/unit/hooks-manager.test.ts`
  - verify: `8457025` 覆盖 recoverable/already-restored/source-missing/invalid; 清理只改 sidecar。
- [x] 任务 3: 接入主进程 IPC handler, 清理后刷新资产。
  - tests: `pnpm typecheck:node`
  - verify: handler 只暴露枚举/清理恢复点; restore 仍复用 `hooks:set-enabled` 写回路径。
- [x] 任务 4: 在 Hooks 页面实现恢复中心 UI 与 i18n。
  - tests: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`, `pnpm typecheck:web`
  - verify: `974f720` 添加恢复中心 UI 与中英文文案; `0f97d26` 稳定 loader effect; `db41b92` 将恢复中心移到生命周期网格上方, 避免展开后命令过窄。
- [x] 任务 5: 全量验证与真实 Electron 截图。
  - tests: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict`, `pnpm harness:issues`
  - verify: 全量检查通过; 真实 Electron 截图 `C:\Users\mail\AppData\Local\Temp\berth-hooks-recovery-hooks.png`; 展开状态用 Playwright Electron 验证 `recoveryOpen=true`, 截图 `C:\Users\mail\AppData\Local\Temp\berth-hooks-recovery-playwright-expanded-wide.png`。

## verify 回写

- Archive 未完成: `node scripts/harness-projects.mjs ensure docs/works/2026-06-02-gh-13-hook-operation-recovery-center` 因本机 `gh` 缺少 `project,read:project` scope 失败。当前 INDEX 使用 `phase: blocked` + `gh_project.status: pending-auth`, 不使用假 `item_id`。
