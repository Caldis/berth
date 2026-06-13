# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 扫描引擎 Settings 入口 v1
  - scope: `ScanEngineInfo` 类型、runtime 信息聚合、`assets:engine-info` IPC/preload/mock、Settings section、i18n。
  - tests: `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/ipc-contract.test.ts tests/renderer/settings-page.test.tsx`
  - verify: passed 2026-06-13; 另跑 `pnpm typecheck:node`, `pnpm typecheck:web`, `pnpm harness:check`。Scanning 区顶部能看到版本、状态、索引资产数、索引文件数、错误数、最近刷新、真实只读控制项和手动 refresh; loading/error/disabled/focus 状态由 renderer test 覆盖。

- [x] 任务 2: 扫描调度控制模型
  - scope: `ScanCoordinator` 增加 queue/reason/coalescing 状态; runtime 暴露 paused/cancelable capability; Settings 显示真实状态。
  - tests: `pnpm vitest run tests/unit/scan-coordinator.test.ts tests/unit/agent-asset-runtime.test.ts tests/renderer/settings-page.test.tsx`
  - verify: refresh 去重、排队、暂停/恢复计划、错误保留旧 snapshot; UI 状态随 progress/change 更新。
  - progress 2026-06-13: added persisted scan engine settings for watcher debounce/min interval; Settings can edit those two real runtime parameters through IPC, while pause/cancel/queue remain explicitly unsupported. Passed `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/scan-engine-settings.test.ts tests/unit/ipc-contract.test.ts` and `pnpm vitest run tests/renderer/settings-page.test.tsx tests/renderer/settings-agent-plugins.test.tsx`; typecheck web/test passed.
  - progress 2026-06-13: exposed scheduler snapshot in `ScanEngineInfo`, including in-flight state, delayed watcher refresh, queued project-scope refresh, and last watcher start time. Settings now shows scheduled/queued refresh controls as read-only real state while pause/cancel remain unsupported. Passed `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/ipc-contract.test.ts tests/renderer/settings-page.test.tsx`, `pnpm typecheck:node`, `pnpm typecheck:web`, and `pnpm harness:check`.

- [x] 任务 3: project scope filter-first
  - scope: `project-scope-runtime.ts` 优先用已有 global snapshot 过滤; 缺缓存时后台 refresh, 不在已有数据时同步 full scan。
  - tests: `pnpm vitest run tests/unit/project-scope-runtime.test.ts tests/unit/agent-asset-runtime.test.ts`
  - verify: passed 2026-06-13; 另跑 `pnpm typecheck:node`。已缓存项目直接切换不重扫; 未缓存项目只发起 `wait:false` 后台 refresh; 同一项目重复选择不重扫也不重启 watcher。

- [x] 任务 4: Adapter public API 收敛
  - scope: 新 adapter declaration contract; package export; Claude/Codex source declarations 迁移; 移除 manifest adapter 旧方法残留。
  - tests: `pnpm vitest run tests/unit/agent-asset-runtime.test.ts tests/unit/watch-wiring.test.ts` + 新 adapter API tests。
  - verify: engine 通用文件不再直接依赖第三方 parser; 内置 Claude/Codex 行为不回退。
  - progress 2026-06-13: added public adapter API type export and removed stale manifest adapter methods; passed `pnpm vitest run tests/unit/agent-adapter-registry.test.ts` and `pnpm typecheck:node`。
  - progress 2026-06-13: published `@berth/scan-engine/adapter-api` as a real package subpath with ESM/CJS/type outputs, so independently maintained adapters do not need to import `src/*` deep paths. Passed `pnpm --dir packages/berth-scan-engine test`, `pnpm --dir packages/berth-scan-engine typecheck`, `pnpm --dir packages/berth-scan-engine build`, and Node ESM/CJS self-reference import checks from the package directory。
  - progress 2026-06-13: moved convention and enterprise parser dispatch for shallow scan and incremental derive behind `engine/agent-capabilities.ts`, so regular engine files consume the adapter seam instead of importing Claude/Codex parsers directly. Passed `pnpm vitest run tests/unit/watch-wiring.test.ts tests/unit/agent-asset-runtime.test.ts tests/unit/engine-scanner.test.ts`, `pnpm typecheck:node`, `pnpm --dir packages/berth-scan-engine test`, `pnpm --dir packages/berth-scan-engine typecheck`, and `pnpm --dir packages/berth-scan-engine build`。

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

- [x] 任务 7: 总体验证
  - scope: 补 typecheck、harness、目标组合测试, 回写 `debt.final`。
  - tests: `pnpm typecheck:node`, `pnpm typecheck:web`, `pnpm harness:check`, 以及本任务已改模块的目标 vitest。
  - verify: 远端 CI 成功, Project 状态可同步; Settings 截图检查无溢出。
  - progress 2026-06-13: reproduced the remote `project-scope.e2e.ts` failure locally. Root cause was `ProjectSourceRow` assuming every scan source code had built-in Claude/Codex copy; declared third-party plugin source codes are open strings, so missing copy crashed the renderer and left the page blank. Added a fallback for unknown source codes, covered it in `tests/renderer/project-scope-switcher.test.tsx`, and made the e2e wait for the menu to close before reopening. Passed `pnpm vitest run tests/renderer/project-scope-switcher.test.tsx`, `pnpm typecheck:web`, `pnpm typecheck:test`, `pnpm build`, and `pnpm test:e2e tests/e2e/project-scope.e2e.ts`。
  - progress 2026-06-13: full local verification passed with `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm harness:check`, and `pnpm build`. Electron screenshot check for Settings → Scanning passed at `test-results/settings-scan-engine-verify.png`: scan engine summary and editable controls are visible without obvious overflow or overlap. Remote CI for `08e7347e` passed on ubuntu-latest, windows-2022, and macos-latest (run `27461576090`)。

- [x] 任务 8: Gemini CLI 真实 adapter v1
  - scope: `gemini-cli` 不再只走 metadata-only declared adapter; 新增真实 adapter/parser, 读取稳定低风险本地文件: 用户/项目 `GEMINI.md` 或 `context.fileName` 配置的上下文文件、用户/项目 `settings.json` 中的 MCP servers、`~/.gemini/extensions/*/gemini-extension.json`, 以及 credential presence。`~/.gemini/tmp` 仍只做 source coverage metadata, 不读取 session 内容。
  - tests: `pnpm vitest run tests/unit/agent-adapter-registry.test.ts tests/unit/agent-capability-plugins.test.ts tests/unit/planned-agent-adapter-definitions.test.ts`; `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm --dir packages/berth-scan-engine test`; `pnpm --dir packages/berth-scan-engine typecheck`; `pnpm --dir packages/berth-scan-engine build`。
  - verify: passed 2026-06-13。真实本机 `gemini --version` 为 `0.16.0`; `npm view @google/gemini-cli version` 为 `0.46.0`, 未改动用户全局安装。用已构建 `packages/berth-scan-engine/dist/cli.cjs scan --agent gemini-cli --home-dir $env:USERPROFILE --project D:\Code\berth` 对真实 `~/.gemini` 扫描, 结果为 `gemini.user.settings:scanned`, `gemini.user.sessions:scanned:sensitive-metadata-only`, Gemini 相关 errors=0, 只产出 credential presence 资产且不输出 credential/session 内容。

- [x] 任务 9: OpenCode 真实 adapter v1
  - scope: `opencode` 不再只走 metadata-only declared adapter; 新增真实 adapter/parser, 读取稳定低风险本地文件: 用户/项目 `opencode.json|opencode.jsonc` 中的 MCP servers、agent、command 定义, 用户/项目 `AGENTS.md`, `agents/`, `commands/`, `skills/`, `plugins/**/plugin.json`, 以及 `~/.local/share/opencode/auth.json` 的 credential presence。`opencode.db` 和 logs 仍只在 source coverage 中按 sensitive/debug metadata 展示, 不读取正文。
  - tests: `pnpm vitest run tests/unit/agent-adapter-registry.test.ts tests/unit/agent-capability-plugins.test.ts tests/unit/planned-agent-adapter-definitions.test.ts`; `pnpm typecheck:node`; `pnpm typecheck:web`; `pnpm typecheck:test`; `pnpm --dir packages/berth-scan-engine test`; `pnpm --dir packages/berth-scan-engine typecheck`; `pnpm --dir packages/berth-scan-engine build`; `pnpm lint`; `pnpm harness:check`; `pnpm build`。
  - verify: passed 2026-06-13。真实本机 `opencode --version` 为 `1.1.25`。用已构建 `packages/berth-scan-engine/dist/cli.cjs scan --agent opencode --home-dir $env:USERPROFILE --project D:\Code\berth` 对真实 OpenCode home 扫描, 结果为 OpenCode assets=40 (`credential=1`, `skill=39`), scanned sources 包含 `opencode.user.assets`, `opencode.project.agents-md`, `opencode.user.auth`, `opencode.user.logs`, sensitive sources 为 `opencode.user.auth:credential-presence-only`, `opencode.user.sessions-db:sensitive-metadata-only`, `opencode.user.logs:debug-summary-only`, OpenCode 相关 errors=0。

- [x] 任务 10: Copilot/Cursor/OpenClaw/Hermes source contract 校准
  - scope: 复用子代理只读调研结果, 按官方/primary-source 修正剩余四个 planned adapters 的 source declarations 与敏感策略。不写 parser, 不执行外部命令。Copilot 拆开 `~/.copilot` 宽路径, 补 settings/config/permissions/instructions/agents/skills/hooks/LSP/plugins/log/session/cache/project `.github` sources; Cursor 修正版本 probe 为官方 `agent --version`, 补 permissions/sandbox/hooks/mcp/agents/plugins/subagents, 并把 `.cursor/commands` 标为 heuristic; OpenClaw 将 plugins/logs 从猜测路径降级或替换为官方 extensions/session/log/credential sources; Hermes 补 profile/env/auth/project context/sessions/cache/browser recordings, 并把 checkpoints 改为 `~/.hermes/checkpoints`。
  - tests: `pnpm vitest run tests/unit/planned-agent-adapter-definitions.test.ts tests/unit/agent-capability-plugins.test.ts tests/unit/agent-adapter-registry.test.ts`; `pnpm typecheck:node`; `pnpm typecheck:test`。
  - verify: passed 2026-06-13。敏感源断言已覆盖 `auth` / `token` 类 source, 防止后续误标为 normal。

- [x] 任务 11: OpenCode shared skill 重复 ID CI 修复
  - scope: OpenCode 真实 adapter 不再读取 `~/.agents/skills` 和 `<project>/.agents/skills`; 这些共享 skill 仍由 Codex adapter 负责。这样 OpenCode 的真实扫描面与 source coverage 中的 `~/.config/opencode` / `.opencode` 声明保持一致, 避免同一物理 `SKILL.md` 被两个 adapter 产出相同 `skill-project-*` id。
  - tests: `pnpm --filter @berth/scan-engine exec vitest run tests/scan-bridge.test.ts`; `pnpm vitest run tests/unit/agent-adapter-registry.test.ts tests/unit/parser-identity.test.ts`; `pnpm test:e2e tests/e2e/project-scope.e2e.ts`。
  - verify: passed 2026-06-13。回归测试新增 “多 adapter 注册时资产 id 唯一” 断言; 本机复跑远端失败的 project scope e2e 已通过。

- [x] 任务 12: GitHub Copilot CLI 真实 adapter v1
  - scope: `github-copilot-cli` 不再只走 metadata-only declared adapter; 新增真实 adapter/parser, 读取稳定低风险本地文件: 用户/项目 custom instructions、`AGENTS.md`、agents、skills、MCP config、settings 内 inline MCP/hooks、hook 文件、installed plugin manifest, 以及 `~/.copilot/config.json` 的 credential presence。`config.json` 正文、permissions、session-state、session-store、logs、plugin-data 仍只做 source coverage metadata, 不读取正文。扫描器同时按相同 deterministic asset id 合并共享 `.agents/skills` 读者, 防止 Copilot/Codex 重复资产进入搜索索引。
  - tests: `pnpm vitest run tests/unit/agent-adapter-registry.test.ts tests/unit/scope-dedupe.test.ts tests/unit/planned-agent-adapter-definitions.test.ts tests/unit/agent-capability-plugins.test.ts`; `pnpm vitest run tests/unit/engine-scanner.test.ts tests/unit/search.test.ts tests/unit/asset-dedupe.test.ts`; `pnpm --filter @berth/scan-engine test`; `pnpm --filter @berth/scan-engine typecheck`; `pnpm --filter @berth/scan-engine build`; `pnpm typecheck:node`; `pnpm typecheck:test`; `pnpm typecheck:web`; `pnpm lint`。
  - verify: passed 2026-06-13。真实本机 `copilot --version` 为 `GitHub Copilot CLI 0.0.414`。用已构建 `packages/berth-scan-engine/dist/cli.cjs scan --home-dir $env:USERPROFILE --project D:\Code\berth --json` 汇总 Copilot 相关扫描: `assetCount=1` (`credential=1`), Copilot 相关 errors=0, scanned sources 包含 `copilot.user.home`, `copilot.user.config`, `copilot.user.shared-skills`, `copilot.user.logs`, `copilot.user.sessions`, `copilot.project.shared-skills`, `copilot.project.agents-md`; sensitive/debug sources 均保持 `credential-presence-only` / `sensitive-metadata-only` / `debug-summary-only`。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
