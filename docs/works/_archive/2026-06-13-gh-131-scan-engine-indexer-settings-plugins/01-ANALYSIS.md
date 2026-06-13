# 需求分析 (Explore 产物)

## 现状理解
扫描引擎现在是本地资产索引层。`docs/ARCHITECTURE.md` 已把 `@berth/scan-engine` 定义为 data kernel + standalone scan CLI, Electron main 通过源码 alias 使用它, renderer 不直接碰 engine。

当前链路:
- `src/main/index.ts` 创建 `AgentAssetRuntime`, 连接 SQLite snapshot store、watcher、worker scanner, 并把 `assets:changed` / `assets:progress` 发给 renderer。
- `packages/berth-scan-engine/src/engine/assets/runtime.ts` 保存 snapshot/status, 提供 `refresh`, `scheduleRefresh`, `setProjectDir`, `restorePersistedSnapshot`, `applyFileChange` 等能力。
- `packages/berth-scan-engine/src/engine/assets/scan-coordinator.ts` 只负责一次扫描的 in-flight 去重、generation guard 和进度转发。它还不是后台调度器。
- `packages/berth-scan-engine/src/engine/assets/worker-host.ts` 每次扫描创建一个 worker, worker 内跑 `AssetScanner.scanAll()`。这说明扫描模型仍是 one-shot full scan, 不是长驻索引服务。
- `packages/berth-scan-engine/src/engine/watcher.ts` 聚合 Claude / Codex / project roots / sessions 等 watch target。
- `packages/berth-scan-engine/src/engine/assets/watch-wiring.ts` 对已支持文件类型做增量折叠; 对 plugin-bundled 等无法从单文件推导的变更, 仍回退到 scheduleRefresh。
- `src/main/project-scope-runtime.ts` 切换 scope 时若没有缓存 snapshot, 会同步等待 `runtime.refresh({ reason: "project-scope", wait: true })`。这和“scope 只过滤, 不触发扫描”的目标仍冲突。

IPC / renderer 现状:
- `src/main/ipc/handlers.ts` 已有 `assets:snapshot`, `assets:status`, `assets:refresh`, `assets:scan-sources`, `assets:get`, `assets:search`, `assets:health-check`, `agent-plugins:list`。
- `src/preload/index.ts` 只把这些能力暴露为 `window.api.assets.*`。没有扫描引擎版本、参数、控制面或统一设置 IPC。
- `src/renderer/src/hooks/use-ipc.ts` 的 `useAssetRuntime` 能拿 snapshot/status/progress, 但这些信息只散落给页面使用, 没有在 Settings 中形成一个 scan engine 面板。
- `src/renderer/src/components/settings/settings-content.tsx` 目前 Scanning 区只有 File Watching 自动开关和 `AgentCapabilityPluginsSection`。插件注册表能展示插件元数据, 但不是扫描引擎自身的入口。

接口 / 插件现状:
- `packages/berth-scan-engine/src/shared/types/asset.ts` 的 `AgentAdapter` 只有 `detect`, `scanRoots`, `scanSourceCoverage`, `scanAll`。接口注释写明旧的 `scanAssets/watchAssets/resolveRelations` 已移除。
- `packages/berth-scan-engine/src/agent-plugins/adapter-registry.ts` 中 `ManifestAgentAdapter` 仍保留 `scanAssets/watchAssets/resolveRelations` 旧方法, 和当前接口语义不一致。
- `packages/berth-scan-engine/src/engine/agent-capabilities.ts` 是 adapter source 的收敛口, 但 `derive-asset.ts` 等文件仍直接 import Claude / Codex parser。新 agent 接入如果继续这样写, 会把 adapter 细节扩散到 engine。
- `packages/berth-scan-engine/package.json` 当前只导出 `"."`, 内部 engine/types 主要靠仓库内源码 alias。若未来插件独立维护、独立发布、独立管理版本, 需要一个稳定 package 级 adapter API, 而不是要求插件依赖源码深路径。

## 关联与依赖
调用关系:
- renderer Settings / pages -> preload `window.api.assets` -> main IPC handlers -> `AgentAssetRuntime` -> scan coordinator / worker / watcher / SQLite store。
- `AgentAssetRuntime.refresh()` -> `ScanCoordinator.startScan()` -> `WorkerAssetScanner.scan()` -> worker `AssetScanner.scanAll()` -> adapters。
- watcher change -> `applyWatchEvent()` -> 能增量推导则 `runtime.applyFileChange()`, 不能推导则 `runtime.scheduleRefresh()`。
- project scope switch -> `activateProjectScope()` -> runtime setProjectDir + 可能等待 full refresh -> renderer snapshot。

scope 差异:
- Global 应代表本机所有可见 agent 资产的完整本地索引。
- Project scope 应是 Global snapshot 的过滤视图; 缺缓存时同步 full scan 会把“打开项目”变成“触发扫描”, 造成可见延迟。
- `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md` 记录了 GH-117: macOS project-scope activate 实测 10047ms, 这是当前架构债的直接证据。

历史取舍:
- 已经有 SQLite SWR、watcher 增量写入、deterministic id、progress event, 说明方向已从纯同步扫描转向缓存与增量。
- 还缺后台调度、暂停/恢复/取消、priority queue、row-level delta、长驻 worker 和 Settings 控制面。
- 现有 plugin registry 偏“元数据展示”, 不是独立 adapter SDK。后续 Gemini / Copilot / Cursor / OpenCode / OpenClaw / Hermes 需要在 source declaration、home resolver、版本探测、敏感文件策略、session 存储读取方式上各自独立。

外部 agent 资料依据:

| Agent | 官方 / primary source | 稳定扫描入口 | 注意事项 |
|---|---|---|---|
| Gemini CLI | https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md, https://google-gemini.github.io/gemini-cli/docs/extensions/ | `~/.gemini/settings.json`, project `.gemini/settings.json`, `GEMINI.md` 或配置的 context file, `~/.gemini/extensions/*/gemini-extension.json`, `~/.gemini/tmp/<project_hash>/` | context 文件名可配置; tmp/session 目录可能很大; auth 文件只做敏感存在性标记。 |
| GitHub Copilot CLI | https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference, https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference | `COPILOT_HOME` 或 `~/.copilot`, instructions, agents, skills, hooks, MCP/LSP/permissions, `session-state`, `session-store.db`, logs | 本地 session 可能只是远端同步副本; `config.json` / session DB schema 由 CLI 管理, 不应深度依赖。 |
| Cursor | https://cursor.com/docs/rules, https://cursor.com/docs/mcp, https://cursor.com/docs/cli/reference/configuration, https://cursor.com/docs/hooks, https://cursor.com/docs/skills | project `.cursor/rules`, `.cursor/mcp.json`, `.cursor/hooks.json`, `.cursor/skills`, `.cursor/commands`, `AGENTS.md`; user `~/.cursor/*`; IDE `Cursor/User/globalStorage` / `workspaceStorage` / `state.vscdb` | Cursor 闭源; chat/history DB schema 非公开稳定契约。会话解析应标为实验性, 默认只读 metadata。 |
| OpenCode | https://opencode.ai/docs/config/, https://opencode.ai/docs/rules/, https://opencode.ai/docs/plugins/, https://github.com/anomalyco/opencode | `opencode.json|jsonc`, `.opencode/*`, `~/.config/opencode/*`, `AGENTS.md`, `~/.local/share/opencode/opencode.db` 和 legacy storage | 配置支持 env/file substitution; plugin 不可执行; DB 与旧 JSON storage 需要并存兼容。 |
| OpenClaw | https://docs.openclaw.ai/cli, https://docs.openclaw.ai/gateway/configuration, https://docs.openclaw.ai/tools/skills, https://github.com/openclaw/openclaw | `OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH` / `OPENCLAW_HOME`, `~/.openclaw/openclaw.json`, workspace instructions, skills, plugins, sessions, trajectory, logs | 它更像 Gateway + 多入口 agent 系统; 路径覆盖多, 扫描结果必须展示解析依据。 |
| Hermes Agent | https://hermes-agent.nousresearch.com/docs/developer-guide/session-storage, https://hermes-agent.nousresearch.com/docs/user-guide/configuration, https://github.com/NousResearch/hermes-agent | `HERMES_HOME`, config.yaml, `SOUL.md`, memories, skills, plugins, hooks, `state.db`, logs, checkpoints | 文档常写 `~/.hermes`, 但 Windows 默认可能不同; session 真源是 SQLite `state.db`, legacy JSONL 只能兼容读取。 |

这些资料都支持同一个扫描策略: 先解析 home/config/source declaration, 再按插件声明的 source 分组做轻量 metadata 扫描; 对 session/log/cache/credential 只读摘要、大小、mtime、最近少量结构信息, 默认不读敏感全文, 不执行外部 CLI、hook、plugin 或 install/update 命令。

blast radius:
- Engine contract: `packages/berth-scan-engine/src/shared/types/asset.ts`, `src/shared/types/ipc.ts`, `src/index.ts`。
- Runtime and scheduler: `engine/assets/runtime.ts`, `scan-coordinator.ts`, `worker-host.ts`, `worker.ts`, `watch-wiring.ts`, `derive-asset.ts`。
- Adapter boundaries: `engine/agent-capabilities.ts`, `adapters/*/sources.ts`, `agent-plugins/adapter-registry.ts`。
- Main IPC/preload: `src/main/ipc/handlers.ts`, `src/preload/index.ts`, `tests/unit/ipc-contract.test.ts`, `tests/setup.ts`。
- Renderer Settings: `settings-content.tsx`, new scan engine settings component/hook, `use-ipc.ts`, i18n locale files, renderer settings tests。
- Website/plugin pages: 当前需要先查 website 结构; 新 agent 插件介绍与下载页应作为后续实施项独立推进。

## 任务分类与 debt 校准
- type: feature。
- source.kind: user-request, refs 包含 `docs/issues/2026-06-07-FEATURE-background-progressive-asset-indexer.md`。
- debt estimate 修正: 保持 `incurred: 8`, `repaid: 6`, `net: 2`。
- scope / risk / areas / confidence: 保持 global / high / architecture + performance + ui-ux + testability / low。
- revision: 不追加。Explore 证实初始判断准确: 新设置入口和独立插件 API 会扩大 public surface, 但能偿还 scanAll、scope 重扫、adapter 直连和扫描不可见的问题。

## 验收标准
逐条编号, SPEC 与 verify 据此核对。
1. Settings 中有扫描引擎统一入口, 能显示 engine 名称、版本、运行状态、最近完成时间、当前进度、错误数、索引资产数和索引文件数。
2. Settings 入口展示当前真实控制面: 手动刷新、watcher debounce/min interval、worker 模式、scheduler 模式、scope 行为、缓存来源、增量能力和不支持项。还不能调整的参数必须明确显示为只读或暂不可用, 不能伪装成可写。
3. 扫描引擎信息通过明确 IPC/类型契约暴露, preload、main handler、renderer mock 和 IPC contract test 四处一致。
4. 后台扫描重构把 full scan、incremental file change、project-scope filtering、refresh scheduling 分成可独立测试的接口; scope 切换不得在已有 global snapshot 时同步触发 full scan。
5. 引擎拥有可观测状态机: idle / scanning / stale / paused / error 等状态能从 main 到 renderer 连续更新; refresh 去重、取消/暂停计划、错误传播和旧数据保留都有测试。
6. Adapter API 收敛成可发布的 package 级契约, 插件不依赖 engine 源码深路径; adapter 声明 source、home resolver、version probe、sensitivity、watch support、session/log/cache scan policy。
7. Claude Code / Codex 现有 adapter 迁移到新 API 后行为不回退; 旧的 `scanAssets/watchAssets/resolveRelations` 残留被移除或隔离。
8. Gemini CLI、GitHub Copilot CLI、Cursor、OpenCode、OpenClaw、Hermes Agent 至少完成官方资料支持的 source declaration 与扫描策略文档; 实现 adapter 时必须各自有独立版本、manifest、release/update 元数据和测试样本。
9. 官网/文档站为每个可选 agent 插件提供独立介绍和下载入口; 页面说明扫描范围、敏感文件处理、版本支持和限制。
10. 所有扫描 session/log/cache/credential 类文件默认只做 metadata/index 摘要, 不执行外部命令、不启动插件、不读取 token 原文。
11. 目标测试覆盖 runtime/coordinator/watch-wiring/project-scope/IPC/settings renderer/plugin source declaration; 大范围重构后补 typecheck 和 harness check。
12. 大量文件、缺权限、损坏 SQLite/JSON、旧版本路径、环境变量覆盖、未安装 CLI 和并行 watcher 事件都能给出稳定状态, 不清空已有 snapshot。

## 界面质量与交互验收
现有 Settings 是紧凑的设置面板, 使用自建 React 组件、Radix primitive 和 Tailwind utility。当前 Scanning 区信息量低: 只有 File Watching 自动开关与 agent plugin 列表, 用户无法判断扫描引擎版本、是否正在扫、扫了多少、什么时候失败、哪些参数实际生效。

用户路径:
- 打开 Settings -> Scanning。
- 先看到扫描引擎摘要: 状态、版本、索引数量、最近刷新。
- 展开或进入详情后看到 control parameters、source coverage、adapter/plugin 列表和敏感文件策略。
- 可执行手动刷新; 可写参数在实现支持前不展示为可写输入。

界面风险:
- 信息面多, 不能堆成长表。需要分组: Summary、Runtime、Controls、Sources、Plugins、Limits。
- Settings modal 宽度有限, 数字和路径必须换行/截断可读, 不能撑破容器。
- 状态更新来自 progress/change 事件, UI 不能因为一次 refresh error 清空旧数据。
- 控制项如 pause/cancel/schedule interval 若 engine 尚未支持, 必须 disabled 并标注原因。
- i18n 需要同时维护 `en.json` 与 `zh.json`; 数字、时间、路径要用已有格式工具或稳定本地格式。

## 未决问题
留给 design 向人澄清。
- 无阻塞性问题。按以下假设继续设计:
  - 第一批实现优先把“真实可见”做好: 版本、状态、索引数量、当前只读控制面和手动 refresh。
  - pause/cancel、priority queue、持久化可调参数、长驻 worker、row-level delta 分批推进, 每批都有目标测试和小提交。
  - 第三方 agent adapter 先做 source declaration / scanner policy / fixture test, 不自动执行任何外部 CLI。
  - 官网插件页可在 adapter API 稳定后独立补齐; 当前任务先把数据模型和计划写清。
