# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 增加扫描来源数据契约与 IPC。先补 `AssetScanner.getScanSourceGroups()` 单元测试, 再实现 shared/preload/main handler。verify: `pnpm test -- tests/unit/engine-scanner.test.ts` + `pnpm typecheck` 通过。
- [x] 任务 2: 调整 Codex scan root 与 watcher。先补 Codex adapter 测试, 再让 `CodexAdapter.scanRoots()` 返回 `~/.codex/sessions`, watcher 监听存在的 Codex sessions。verify: `pnpm test -- tests/unit/codex-adapter.test.ts tests/unit/engine-scanner.test.ts` 通过。
- [x] 任务 3: 设置页改为只读“本地来源”。先写 renderer 测试覆盖 Claude/Codex 来源展示和不存在来源禁用, 再实现 `useScanSources()` 与 settings UI/i18n。verify: `pnpm test -- tests/renderer/settings-sources.test.tsx` 通过。
- [x] 任务 4: 修 agent-aware health check。先补主进程纯函数单测, 再避免 Codex-only 环境出现 `no-claude-dir` 全局错误。verify: `pnpm test -- tests/unit/health-check.test.ts` + `pnpm typecheck` 通过。
- [x] 任务 5: 总验证与阶段收口。跑 `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm harness:check`; 全部通过后更新 INDEX.phase=verify。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。

- [x] 任务 6: 根据用户验收反馈调整本地来源展示。默认只显示 Claude Code / Codex 两个 Agent 汇总行, 不默认展开具体路径; 具体 user/project/session 来源放入每个 Agent 的折叠明细。verify: 更新 renderer 测试, `pnpm test -- tests/renderer/settings-sources.test.tsx`, `pnpm typecheck` 通过。

边界记录: macOS Claude managed settings、Codex archived sessions、Codex home 可配置化和“所有项目目录”扫描属于后续来源覆盖问题, 已记录到 `docs/issues/2026-05-30-IMPROVEMENT-agent-source-coverage.md`。
