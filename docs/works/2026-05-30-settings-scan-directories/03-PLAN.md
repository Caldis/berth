# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。

- [x] 任务 1: 增加扫描来源数据契约与 IPC。先补 `AssetScanner.getScanSourceGroups()` 单元测试, 再实现 shared/preload/main handler。verify: `pnpm test -- tests/unit/engine-scanner.test.ts` + `pnpm typecheck` 通过。
- [x] 任务 2: 调整 Codex scan root 与 watcher。先补 Codex adapter 测试, 再让 `CodexAdapter.scanRoots()` 返回 `~/.codex/sessions`, watcher 监听存在的 Codex sessions。verify: `pnpm test -- tests/unit/codex-adapter.test.ts tests/unit/engine-scanner.test.ts` 通过。
- [ ] 任务 3: 设置页改为只读“本地来源”。先写 renderer 测试覆盖 Claude/Codex 来源展示和不存在来源禁用, 再实现 `useScanSources()` 与 settings UI/i18n。verify: `pnpm test -- tests/renderer/settings-sources.test.tsx`。
- [ ] 任务 4: 修 agent-aware health check。先补主进程纯函数或 handler 单测, 再避免 Codex-only 环境出现 `no-claude-dir` 全局错误。verify: 目标单测 + `pnpm typecheck`。
- [ ] 任务 5: 总验证与阶段收口。跑 `pnpm test`, `pnpm typecheck`, `pnpm harness:check`; 通过后更新 INDEX.phase=verify。

## verify 回写

verify 不通过项作为新任务追加于此, phase 退回 implement。
