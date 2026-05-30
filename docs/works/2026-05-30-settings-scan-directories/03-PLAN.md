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

- [x] 任务 7: 重构“本地来源”的信息层级。scan root 文案从“配置文件”改为“实际扫描入口”, 增加每个入口覆盖的资产大类说明; 设置页默认只显示 Agent 摘要和覆盖大类, 展开后按 user/project 分组显示具体入口路径、说明和打开操作。verify: 更新 adapter / renderer 测试, `pnpm test -- tests/unit/claude-code-adapter.test.ts tests/unit/codex-adapter.test.ts tests/renderer/settings-sources.test.tsx`, `pnpm typecheck`, `pnpm lint` 通过。

- [x] 任务 8: 把 source coverage 做成一等数据。每个 adapter 除实际 scanned roots 外, 还返回带 `kind/status/reason` 的来源覆盖列表; renderer 后续基于该结构展示“已扫描 / 未扫描 / 未发现”, 不再靠路径字符串推断文件或目录。verify: 更新 shared 类型、adapter 测试、engine scanner 测试, `pnpm test -- tests/unit/claude-code-adapter.test.ts tests/unit/codex-adapter.test.ts tests/unit/engine-scanner.test.ts`, `pnpm typecheck` 通过。
- [x] 任务 9: 补当前明确缺失的来源扫描。Claude Code 纳入官方 file-based managed settings / managed MCP; Codex 纳入 `archived_sessions`; watcher 同步监听新来源。verify: 新增/更新 adapter、scanner、watcher 测试, `pnpm test -- tests/unit/claude-code-adapter.test.ts tests/unit/codex-adapter.test.ts tests/unit/watcher.test.ts`, `pnpm test -- tests/unit/claude-scanner.test.ts tests/unit/engine-scanner.test.ts`, `pnpm typecheck` 通过。
- [x] 任务 10: 项目级来源改为显式项目索引。仅从当前项目和已解析 session-derived project paths 形成候选来源, 不递归扫磁盘; UI 标明部分并入任务 11 的组件重构。verify: 增加项目候选单测, `pnpm test -- tests/unit/engine-scanner.test.ts`, `pnpm typecheck` 通过。
- [x] 任务 11: 重构本地来源 UI。拆出 `LocalSourcesSection`, 展示已扫描来源、未扫描但已识别来源、未发现来源; main 返回结构化 code, renderer 负责标签兜底; ScanRoot 显式 `kind` 后移除路径字符串图标判断。verify: renderer 测试覆盖折叠、scope 分组、not scanned 提示, `pnpm test -- tests/renderer/settings-sources.test.tsx`, `pnpm typecheck`, `pnpm harness:check` 通过。`pnpm lint` 仍被非本任务文件 `src/shared/types/memory.ts` 的 `@typescript-eslint/ban-types` 阻塞。
- [x] 任务 12: 让 Codex 用户来源跟随 `CODEX_HOME`。Codex adapter、health check、watcher 统一用 `CODEX_HOME` 解析用户级 Codex 根目录, 并补扫 `$CODEX_HOME/skills`; 保留 `~/.agents/skills` 兼容旧来源。verify: `pnpm test -- tests/unit/codex-adapter.test.ts tests/unit/watcher.test.ts tests/unit/health-check.test.ts`, `pnpm typecheck` 通过。
- [x] 任务 13: 收口验证与文档状态。更新 source coverage issue 状态, 跑目标测试、typecheck、lint、build; `pnpm harness:check` 若仍被其他未完成任务阻塞, 在 PLAN 和最终回复记录具体阻塞项。verify: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm harness:check` 通过; `pnpm lint` 被非本任务文件 `src/shared/types/memory.ts` 第 1 行 `@typescript-eslint/ban-types` 阻塞, 已记录到 `docs/issues/2026-05-30-BUG-memory-source-id-lint-failure.md`。
- [x] 任务 14: 默认汇总行增加来源状态计数。Claude / Codex 汇总行显示 scanned / not-scanned / missing 数量, 不展开也能看到覆盖状态。verify: renderer 测试覆盖默认视图计数, `pnpm test -- tests/renderer/settings-sources.test.tsx`, `pnpm typecheck` 通过。
- [x] 任务 15: 来源说明改为稳定 code。main 只返回 source code 与必要 path/status, renderer 根据 code 生成标题和说明, 避免 main 写死英文 UI 文案。verify: renderer / scanner 测试覆盖 code 渲染, `pnpm test -- tests/unit/engine-scanner.test.ts tests/renderer/settings-sources.test.tsx` 通过; `pnpm typecheck` 被并行任务文件 `src/main/engine/hooks-manager.ts` 的未定义 `readBoolean` 阻塞。
- [x] 任务 16: 未扫描项目来源给出明确下一步。session-derived 项目候选显示“打开该项目后扫描”, 当前项目缺失来源显示“已检查当前项目”, 不提供文件打开按钮。verify: renderer 测试覆盖提示与按钮状态, `pnpm test -- tests/renderer/settings-sources.test.tsx`, `pnpm typecheck` 通过。
- [x] 任务 17: 最终验证。`pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm harness:check` 通过; `pnpm lint` 仍被非本任务文件 `src/shared/types/memory.ts` 第 1 行 `@typescript-eslint/ban-types` 阻塞, 另有并行 hooks 页面改动的 `react-hooks/exhaustive-deps` warning。
