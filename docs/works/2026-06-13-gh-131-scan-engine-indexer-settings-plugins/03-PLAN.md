# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 扫描引擎 Settings 入口 v1
  - scope: `ScanEngineInfo` 类型、runtime 信息聚合、`assets:engine-info` IPC/preload/mock、Settings section、i18n。
  - tests: `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/ipc-contract.test.ts tests/renderer/settings-page.test.tsx`
  - verify: passed 2026-06-13; 另跑 `pnpm typecheck:node`, `pnpm typecheck:web`, `pnpm harness:check`。Scanning 区顶部能看到版本、状态、索引资产数、索引文件数、错误数、最近刷新、真实只读控制项和手动 refresh; loading/error/disabled/focus 状态由 renderer test 覆盖。

- [ ] 任务 2: 扫描调度控制模型
  - scope: `ScanCoordinator` 增加 queue/reason/coalescing 状态; runtime 暴露 paused/cancelable capability; Settings 显示真实状态。
  - tests: `pnpm vitest run tests/unit/scan-coordinator.test.ts tests/unit/agent-asset-runtime.test.ts tests/renderer/settings-page.test.tsx`
  - verify: refresh 去重、排队、暂停/恢复计划、错误保留旧 snapshot; UI 状态随 progress/change 更新。
  - progress 2026-06-13: added persisted scan engine settings for watcher debounce/min interval; Settings can edit those two real runtime parameters through IPC, while pause/cancel/queue remain explicitly unsupported. Passed `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/scan-engine-settings.test.ts tests/unit/ipc-contract.test.ts` and `pnpm vitest run tests/renderer/settings-page.test.tsx tests/renderer/settings-agent-plugins.test.tsx`; typecheck web/test passed.
  - progress 2026-06-13: exposed scheduler snapshot in `ScanEngineInfo`, including in-flight state, delayed watcher refresh, queued project-scope refresh, and last watcher start time. Settings now shows scheduled/queued refresh controls as read-only real state while pause/cancel remain unsupported. Passed `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/ipc-contract.test.ts tests/renderer/settings-page.test.tsx`, `pnpm typecheck:node`, `pnpm typecheck:web`, and `pnpm harness:check`.

- [x] 任务 3: project scope filter-first
  - scope: `project-scope-runtime.ts` 优先用已有 global snapshot 过滤; 缺缓存时后台 refresh, 不在已有数据时同步 full scan。
  - tests: `pnpm vitest run tests/unit/project-scope-runtime.test.ts tests/unit/agent-asset-runtime.test.ts`
  - verify: passed 2026-06-13; 另跑 `pnpm typecheck:node`。已缓存项目直接切换不重扫; 未缓存项目只发起 `wait:false` 后台 refresh; 同一项目重复选择不重扫也不重启 watcher。

- [ ] 任务 4: Adapter public API 收敛
  - scope: 新 adapter declaration contract; package export; Claude/Codex source declarations 迁移; 移除 manifest adapter 旧方法残留。
  - tests: `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/watch-wiring.test.ts` + 新 adapter API tests。
  - verify: engine 通用文件不再直接依赖第三方 parser; 内置 Claude/Codex 行为不回退。
  - progress 2026-06-13: added public adapter API type export and removed stale manifest adapter methods; passed `pnpm vitest run tests/unit/agent-adapter-registry.test.ts` and `pnpm typecheck:node`。

- [x] 任务 5: 新 agent source declarations
  - scope: Gemini CLI、GitHub Copilot CLI、Cursor、OpenCode、OpenClaw、Hermes Agent 的 home resolver、source declaration、敏感文件策略、version probe 描述与 fixtures。
  - tests: `pnpm vitest run tests/unit/agent-adapter-registry.test.ts tests/unit/agent-capability-plugins.test.ts tests/unit/planned-agent-adapter-definitions.test.ts`。
  - verify: 每个 agent 的 config/instruction/skill/plugin/session/log/cache/credential 类源都有官方资料引用或明确“不稳定/经验性”标注; 扫描不执行外部命令。
  - progress 2026-06-13: added planned adapter definitions for all six requested agents with homepage/download URL, version probe, source policy, evidence URL, and metadata-only sensitive source handling; passed `pnpm vitest run tests/unit/planned-agent-adapter-definitions.test.ts` and `pnpm typecheck:node`。
  - progress 2026-06-13: planned adapter definitions now appear in the Agent Capability Plugins registry as disabled metadata-only entries with homepage/download references and declared `not-scanned` source coverage; passed `pnpm vitest run tests/unit/agent-capability-plugins.test.ts tests/unit/planned-agent-adapter-definitions.test.ts`, `pnpm typecheck:node`, and `pnpm typecheck:test`。
  - progress 2026-06-13: added metadata-only `DeclaredAgentAdapter` registration for the six planned agents. The scanner now resolves declared home/project/special paths into source coverage, reports installed state from existing declared sources, keeps sensitive session/log/state sources metadata-only, and returns no parsed assets until concrete parsers land. Passed `pnpm vitest run tests/unit/agent-adapter-registry.test.ts tests/unit/agent-capability-plugins.test.ts tests/unit/planned-agent-adapter-definitions.test.ts`, `pnpm vitest run tests/unit/engine-scanner.test.ts tests/unit/scan-coverage.test.ts tests/unit/agent-asset-runtime.test.ts`, and `pnpm typecheck:node`。

- [x] 任务 6: 插件介绍与下载页
  - scope: 查 website 结构; 为每个可选 agent 插件新增独立介绍/下载页或数据入口。
  - tests: `pnpm vitest run tests/renderer/plugin-detail.test.tsx tests/renderer/settings-agent-plugins.test.tsx tests/renderer/settings-dialog.test.tsx tests/unit/agent-capability-plugins.test.ts`。
  - verify: 页面说明版本、下载入口、扫描范围、敏感文件处理和限制。
  - progress 2026-06-13: no standalone website package or build script exists in this repo, so implemented an in-app standalone route `/capabilities/plugins/:pluginId` backed by the agent plugin registry. Settings can open this route from expanded plugin details; the page shows homepage/download/reference links, declared scan source paths, sensitivity policy, evidence links, limits, asset types, and permissions. Passed the target tests above plus `pnpm typecheck:web` and `pnpm typecheck:node`。

- [ ] 任务 7: 总体验证
  - scope: 补 typecheck、harness、目标组合测试, 回写 `debt.final`。
  - tests: `pnpm typecheck:node`, `pnpm typecheck:web`, `pnpm harness:check`, 以及本任务已改模块的目标 vitest。
  - verify: 远端 CI 成功, Project 状态可同步; Settings 截图检查无溢出。
  - progress 2026-06-13: reproduced the remote `project-scope.e2e.ts` failure locally. Root cause was `ProjectSourceRow` assuming every scan source code had built-in Claude/Codex copy; declared third-party plugin source codes are open strings, so missing copy crashed the renderer and left the page blank. Added a fallback for unknown source codes, covered it in `tests/renderer/project-scope-switcher.test.tsx`, and made the e2e wait for the menu to close before reopening. Passed `pnpm vitest run tests/renderer/project-scope-switcher.test.tsx`, `pnpm typecheck:web`, `pnpm typecheck:test`, `pnpm build`, and `pnpm test:e2e tests/e2e/project-scope.e2e.ts`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
