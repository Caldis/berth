# 需求分析 (Explore 产物) — GH-110 核心资产扫描模块生产级升级

> 证据来源: 两条并行探索流 (官方规范研究 wkinlqjsb + 引擎提取架构 wa4lnx9e3)、本机真实目录实测、主 Agent 直接读码。所有 file:line 均经核验。

## 现状理解

### 进程 / 模块 / IPC 契约
- **主进程扫描链路** (纯 Node, 无 Electron 依赖): `runtime.ts` (中心 runtime, 持有单一 `AssetSnapshot`) → `worker-host.ts` (每次 `scanAll()` **新建一个 Worker**) → `worker.ts` → `scanner.ts` (遍历 adapter) → `adapters/{claude-code,codex}` (走**硬编码路径白名单** + glob 解析) → 扁平 `Asset[]` → snapshot → IPC selectors。
- **Electron 胶水层** (仅 4 文件 import electron, wa4lnx9e3 实测): `src/main/index.ts` (app/BrowserWindow)、`src/main/ipc/handlers.ts` (ipcMain/nativeTheme/shell)、`src/main/engine/watcher.ts` (仅 `mainWindow.webContents.send('assets:changed')`)、`src/main/dev-instance.ts` (App.setPath)。引擎核心 + adapters + agent-plugins + shared ≈ 93% 文件为纯 Node, 可干净提取。
- **IPC 契约**: `assets:snapshot/status/refresh/scan-all`、`sessions:list`、`usage:summary`、`assets:health-check/search/relations`、`project-scope:activate/candidates`。`handlers.ts:89` 原样返回快照, **无服务端 scope 过滤**; 过滤全在渲染层 `filterAssetsByAppScope` (`scope.ts:88`)。
- **渲染层**: `stores/app.ts` 存快照; 页面 (`capabilities.tsx`/`instructions.tsx`) 客户端按 type/scope/search 过滤; 边栏 `project-scope-switcher.tsx`。

### 既有可复用基础设施 (关键: 多为"已建未用")
- `engine/relations.ts` 已实现 `resolveRelations()`: claude-md/agents-md→`imports`、session→`uses`(skillsUsed/mcpServers)、plugin→`contains`、hook→`triggered-by`, 且 `buildImportChain()` 递归 + 环检测。**关联关系基础设施已存在**。
- `shared/types/asset.ts`: `Relation{from,to,kind: imports|uses|contains|triggered-by|belongs-to}`、`AgentAdapter.resolveRelations()` 契约已定义; `AssetType` 已含 `marketplace/worktree/backup/...` (多于扫描器实产)。
- `agent-plugins/descriptors.ts`: 声明式扫描源单一真源雏形 (CLAUDE/CODEX_SOURCE_DESCRIPTORS), 但**当前只驱动 UI 覆盖展示, 不驱动真实扫描** (扫描在 `scanner.ts` 另行硬编码)。
- `agent-plugins/manifest.ts`: 已校验第三方 manifest 的 `sourceDescriptors`/`assetDescriptors`/`permissions`/`implementation` + activationReadiness 门禁。
- `registry.ts`: CLAUDE/CODEX 资产描述符 (19/7 行)、hook schema (27/9 事件)、health 描述符 (25/26)。
- `engine/search.ts` (MiniSearch)、`engine/health.ts` (跨 agent 体检) 完整可复用。
- `agent-homes.ts`: `homeDir`/`env` 全可注入; `BERTH_EXTRA_CLAUDE_DIRS`/`BERTH_EXTRA_CODEX_HOMES`/`CODEX_HOME` 已支持 → fixture E2E 可行。

## 关联与依赖

### Scope 语义与"切换即重扫"机制 (秒级切换的根因)
- `selectScope()` (`project-scope-switcher.tsx:100`) 对**任意**选项 (global/user/project) 都调 `projectScope.activate({projectPath})`; global/user 的 `projectPath=undefined`。
- `activate(undefined)` → `setProjectDir(undefined)` → `resolveProjectConfigRoots(undefined)` 返回 `[]` (`project-config-roots.ts:5`) → `projectDirsFromContext()` 返回 `[]` (`scanner.ts:257`) → **所有项目目录扫描 0 次**。故 global/user 模式下快照里**没有任何项目级资产**; "全局"非聚合。
- 每次 `setProjectDir` 重建 scanner → `refresh` → **新建 Worker + 全量重读重解析整棵 `~/.claude`/`~/.codex` + 项目树** (仅 session JSONL 经 fingerprint cache 复用)。这是 5-10s 等待的机制根因 — 不是单次扫描慢, 而是"切换=全量重扫 + 新建 worker"。
- 边界: 一次只持有一个 `projectDir`, 无法同时呈现多个工程。

### 项目列表来源与局限
- `projectScopeCandidatesFromAssets()` (`project-scope.ts:17`) = 当前 projectDir (`current`) + 每个 **session 资产**的 `meta.projectPath` (`session`)。无会话历史的工程不出现; 从不遍历文件系统发现工程。

### 提取边界 (wa4lnx9e3 实测)
- 引擎→Electron 唯一耦合是 watcher 的 `webContents.send` → 改为注入 `onFileChanged` 回调即可解耦。
- API = 既有 runtime selectors (snapshot/status/refresh/assets/search/sessions/usage/health/relations/sources/candidates); CLI 1:1 映射。

## 官方目录规范对齐 — 零遗漏覆盖矩阵 (本次"不遗漏"的骨架)

> 状态: ✅已扫 / ⚠️部分 / ❌缺失。证据见 wkinlqjsb 官方研究 + 本机实测。

### Claude Code (`~/.claude` 用户态; 项目 `.claude/`; 企业 managed; 插件)
| 资产 | 官方位置 | 现状 |
|---|---|---|
| 约定 CLAUDE.md | `~/.claude/CLAUDE.md`、`<proj>/CLAUDE.md`、`<proj>/.claude/CLAUDE.md` | ⚠️ 缺 `CLAUDE.local.md`、子目录嵌套 CLAUDE.md、`@import` 仅记 meta 不成资产/关系、企业 managed 指令 |
| rules | `~/.claude/rules/`、`<proj>/.claude/rules/` | ❌ (官方研究列出; 本机 ~/.claude 无, 设计按存在即扫处理) |
| skill | `~/.claude/skills/`、`<proj>/.claude/skills/`、**插件 skills/** | ⚠️ 用户/项目已扫; ❌ 插件 skills 全缺 |
| 子代理 agent | `~/.claude/agents/`、`<proj>/.claude/agents/`、**插件 agents/** | ⚠️ 用户/项目已扫 (本机 ~/.claude 无 agents 目录); ❌ 插件 agents 全缺 |
| 命令 command | `~/.claude/commands/`、`<proj>/.claude/commands/`、**插件 commands/** | ⚠️ 用户/项目已扫; ❌ 插件 commands 全缺 |
| 输出模式 | `~/.claude/output-modes/` (本机无) | ✅ 已扫 (`scanner.ts:147`) |
| mcp | `<proj>/.mcp.json`、`~/.claude.json` 顶层、`~/.claude/settings.json`、managed-mcp | ⚠️ `parseMcpServers` 仅读顶层 `mcpServers` (`parsers.ts:191`); ❌ `~/.claude.json` 的 `projects[].mcpServers`、`.claude/settings.json`/`settings.local.json` mcp、**插件 .mcp.json** |
| hook | `~/.claude/settings.json`、`<proj>/.claude/settings.json`、managed | ⚠️ 已扫 settings hooks; ❌ **插件 hooks/hooks.json** |
| 插件 plugin | `~/.claude/plugins/` (`installed_plugins.json`、`known_marketplaces.json`、`cache/<mk>/<plugin>/<ver>/`、`marketplaces/<id>/`、`data/`) | ❌ **`parsePlugin` 仅对顶层目录读 `package.json` (实为 `.claude-plugin/plugin.json`), 不下钻, 不读 registry/marketplace** |
| statusline | `settings.json` statusLine | ✅ |
| permission/env | `settings.json` | ✅ (项目 settings.local 部分) |
| 会话/状态 | `projects/*/*.jsonl`、`history.jsonl`、`todos/`、`plans/` | ⚠️ 已扫 sessions/history/plans/todos; 嵌套 subagent jsonl 按设计排除 |
| 运行时/缓存 (本机实测) | `daemon/ teams/ tasks/ jobs/ telemetry/ cache/ shell-snapshots/ ide/ backups/ paste-cache/ ...` + `*.bak`/`*.log` | ❌ 多数未建模; 设计归"③资源/可观测层", 备份与日志须 ignore |

### Codex (`~/.codex`; 项目 `.codex/` 与 `.agents/`)
| 资产 | 官方位置 | 现状 |
|---|---|---|
| 约定 AGENTS.md | `~/.codex/AGENTS.md`、`<proj>/AGENTS.md` (+ fallback filenames, max bytes) | ✅ 已扫 (描述符) |
| skill | `~/.codex/skills/`、`<proj>/.agents/skills/`、`~/.agents/skills/`、**插件 skills/** | ⚠️ 已扫前三; ❌ 插件 skills |
| 子代理/角色 | `~/.codex/agents/`、`<proj>/.codex/agents/` (角色 TOML) | ⚠️ 描述符已声明; 解析待核 |
| config/mcp/hook | `~/.codex/config.toml` (+ profiles)、`<proj>/.codex/config.toml`、`hooks.json` | ⚠️ 已扫顶层; ❌ profiles、project config 优先级、config.toml 内 mcp_servers 完整度待核 |
| 插件 | `~/.codex/plugins/<mk>/<plugin>/manifest.toml` + skills/hooks/apps/mcp | ❌ 完全未扫 (Codex 也有插件体系) |
| 会话/状态 | `sessions/**/rollout-*.jsonl[.zst]`、`archived_sessions/`、`session_index.jsonl`、SQLite (`state_5`/`memories_1`/`logs_2`/`goals_1`)、`memories/`、`rules/` | ⚠️ 已扫 sessions/archived; ❌ session_index、SQLite、memories、rules |

## 任务分类与 debt 校准
- **type**: feature (debt pool `total=5 status=ok`, 无 maintenance 自动推荐)。
- **source.kind**: user-request; refs: Issue #110 + 4 个折叠 issue。
- **debt estimate 修正**: incurred 13 / repaid 4 / net 9 (explore 维持 0.0-new 后含"引擎提取"的校准值)。
- **scope / risk / areas / confidence**: global / high / [architecture, performance, tooling-ci] / low→medium (探索后对边界更有把握)。
- **revision**: 已记 `debt.revisions[0]` (explore, 引擎提取致 scope→global + tooling-ci)。

## 验收标准 (逐条编号, SPEC 与 verify 据此核对)

**A. 零遗漏扫描覆盖 (对齐官方)**
1. 插件下钻: `~/.claude/plugins/{cache,marketplaces,data}` 下每个插件的 `commands/ agents/ skills/<n>/SKILL.md hooks/hooks.json .mcp.json` 均扫为独立资产; 插件元数据取 `.claude-plugin/plugin.json` (非 package.json); 读 `installed_plugins.json`/`known_marketplaces.json`/`settings.enabledPlugins` 标注启用态。
2. Codex 插件下钻: `~/.codex/plugins/<mk>/<plugin>/manifest.toml` + 其 skills/hooks/mcp 扫为独立资产。
3. 第三方 manifest 插件: 按 `sourceDescriptors` **描述符驱动只读扫描** (用内置 parser, 不执行第三方代码), surfacing 实际资产而非元数据桩。
4. MCP 来源补全: `~/.claude.json` 的 `projects[].mcpServers`、`.claude/settings.json`/`settings.local.json` 的 mcpServers、插件 `.mcp.json` 全部纳入。
5. 约定补全: 嵌套子目录 CLAUDE.md、`CLAUDE.local.md`、`@import` 解析为 `imports` 关系 (复用 `buildImportChain`); Codex profiles/project config 优先级正确。
6. 扫描覆盖矩阵 (本文件上表) 每行在 verify 时逐项核对; "资源/可观测"层资产按分层处理且备份/日志被 ignore。

**B. 关联关系完整呈现**
7. 插件 ↔ 其 skill/mcp/hooks/子代理/命令 以 `contains`/`belongs-to` 关系建模, 并在界面 (插件详情/能力页) 完整展示其提供的组件清单与启用态。
8. `resolveRelations` 对新增的插件组件资产生效 (component → plugin 反向 `belongs-to`; CLAUDE.md `@import` 链可视)。

**C. 模块收敛 + 引擎提取**
9. 核心扫描引擎 + Scope/作用域策略收敛为统一模块; `descriptors.ts` 升级为**同时驱动真实扫描与 UI 覆盖**的单一真源 (含 plugins/settings.local/`~/.claude.json` projects 等新描述符 + 分层 tier)。
10. 引擎提取为可独立发布的包 (默认 `packages/berth-scan-engine`, pnpm workspace, 可 `npm publish`, 带 `bin`); 引擎零 Electron 依赖 (watcher 改注入回调)。
11. 公共 API = 既有 runtime selectors; Electron 主进程改为引擎消费端, IPC handler 退化为薄代理。

**D. agent-friendly CLI + E2E 闭环**
12. CLI 提供 `scan/snapshot/assets/sessions/search/inspect/health/usage/sources/status`, 全 `--json`、确定性退出码 (0 成功/2 无数据/3 需关注)、只读无副作用、`--home-dir`/`--codex-home`/`--project` 注入。
13. 基于 fixture HOME 树 + CLI 子进程的 E2E 测试闭环 (golden snapshot, 路径归一化), 不依赖 Electron; 作为主回归手段。

**E. 性能 (秒级切换 + 无瓶颈)**
14. Scope 切换 (global/user) 为**纯前端再过滤 (不重扫)**; 切项目命中缓存时即时返回。感知切换 < 1s (从 5-10s)。
15. 全局态真正聚合 (用户/企业/插件扫一次 + 按项目缓存); 增量利用 watcher + 全类型 fingerprint cache, 避免每次全量重解析; 大规模资产 (1k+ skills/sessions) 下有基准且无明显卡顿。

**F. UI / HeroUI / 统一 loading**
16. 边栏统一 loading UI: 扫描/切换/刷新共享一致的加载/骨架/错误态反馈。
17. 受影响 UI 一律采用 HeroUI 公共控件 (经 `@/components/ui`), 不手搓; 动画流畅。
18. 折叠的 session-error-channel / virtualization / heroui-followup 在其相关页落地 (见 issue triage)。

**G. 可测试性**
19. 输出模式/命令/子代理等缺测项补**无副作用** fixture 用例并通过; 每个实现项有测试证据或在 03-PLAN 标注 `tests: not needed - <reason>`。

## 界面质量与交互验收
- **现有页面结构**: `capabilities.tsx` (tabs: mcp/hooks/plugins/statusLine/permissions/env, 按 `tabTypeMap` 过滤)、`instructions.tsx` (约定/skill/agent/command)、边栏 `project-scope-switcher` (global/user + 项目候选 + 每项目扫描源覆盖)。设计系统已迁 HeroUI v2 (GH-105/109), 入口 `@/components/ui`。
- **信息密度 / 用户路径**: 用户切 scope → 看某域资产 → 进能力/指令页按类型浏览 → 查看详情/关系。当前 plugins tab 只列插件卡 (无组件); 切换有 5-10s 空窗。
- **可见状态缺口**: 切换期无统一 loading; 扫描错误 (`snapshot.errors`/safeScan 丢弃) 不暴露 (呼应 session-error-channel issue); 大列表无虚拟化 (呼应 virtualization issue)。
- **风险**: 插件组件展开后信息量激增 → 需分组/折叠 (HeroUI Accordion/Card); 关系图避免过度可视化; 秒级切换需乐观 UI + 骨架; 响应式与 focus-ring 按 GH-109 约束。
- **主观视觉项** (贴顶/间距/对齐/动画) 按不变量 22: verify 截图请用户确认后收口。

## 未决问题 (留给 design)
1. **包边界**: 默认仓库内 pnpm workspace 包 `packages/berth-scan-engine` (可发布)。是否接受? 还是要求另起独立仓库? (默认假设已记 PRD; design 出 SPEC 时再确认。)
2. **包名 / bin 名**: 默认 `@berth/engine` + bin `berth-engine` (或 `berth-scan`)。命名待定。
3. **Agent Teams 展示模型** (issue 2026-06-03): runtime-state 还是从 Instructions 省略? 官方双视图下定位需澄清 (研究 agent 亦标此不确定)。
4. **"资源/可观测"层范围**: daemon/teams/tasks/telemetry 等是否需要在 UI 一等展示, 还是仅 CLI/可折叠枚举? 默认后者。
5. **迁移节奏**: 引擎提取 (move 文件 + 改 import) 是高 risk/global 改动, 与功能新增的先后/并行策略 (design 定 03-PLAN 时决定; 倾向"先功能增强落地于现有结构, 再做提取迁移", 或反之 — 取决于回归成本)。

## Issue Triage (折叠决策, 详见 wkinlqjsb)
- **fold (4)**: `2026-06-03-BUG-agent-teams-runtime-state-classification` (→ 扫描分类/官方对齐, 验收 A/未决 3); `2026-06-05-IMPROVEMENT-session-error-channel` (→ 统一错误/loading, 验收 F/16); `2026-06-04-IMPROVEMENT-sessions-list-virtualization` (→ 性能/虚拟化, 验收 E/F); `2026-06-05-IMPROVEMENT-heroui-migration-followup` (→ HeroUI 收敛, 验收 F/17)。
- **defer (2, 不混入本任务)**: `2026-06-06-IMPROVEMENT-unused-filterbar-component` (死代码清理, 正交); `2026-06-05-IMPROVEMENT-accent-names-i18n` (i18n 文案, 正交)。这两条保留在 `docs/issues/`, 本任务仅交叉引用。
