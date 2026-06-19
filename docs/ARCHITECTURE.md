# berth 架构 (Project Map)

面向 Agent 的项目地图。渐进式披露的入口之一, 详见各模块源码。

## 进程边界

- `src/main/` — Electron 主进程 (Node.js)。窗口装配、IPC handler、按需只读域; 数据内核经 `@berth/scan-engine` 消费。
- `src/preload/` — contextIsolation 预加载桥, 暴露受控 API 给渲染层。
- `src/renderer/src/` — React 19 应用 (UI)。无直接 Node 访问。
- `packages/berth-scan-engine/src/shared/` — 跨进程共享类型 (Asset model, IPC 契约); 全仓经 `@shared/*` alias 消费 (GH-121 物理进包, 说明符不变)。

## 仓库布局

- `packages/` — pnpm workspace 成员包。`berth-scan-engine/` (`@berth/scan-engine`) 是**数据内核 + 可独立发布的扫描 CLI** (GH-121 物理迁包完成): `src/{engine,adapters,agent-plugins(adapter-registry/manifest),shared}` + 根级中立件 (log/agent-homes/project-config-roots/project-scope) 物理在包内, 零 electron import; `src/main` 经 `@berth/scan-engine/<path>` 源码 alias 正向消费 (electron-vite/vitest/tsconfig 同源解析), CLI 经 `engine-bridge.ts` 包内相对消费 — 反向依赖已归零。
- `assets/` — 仓库共享静态资产。README 直接引用; website 构建后由 `website/scripts/postbuild.mjs` 复制到 `website/dist/assets/`。
- `docs/` — 冷文档与 harness 操作态: 架构、用户手册、PRD、issues、friction、works。这里不放官网入口 HTML 或共享图片资产。
- `website/` — 官方网站源码, React SSG 多语言静态站。`website/index.html` 是官网入口; `website/public/` 放只属于官网发布的静态文件。
- `.github/workflows/` — CI 与 GitHub Pages 部署。`deploy-website.yml` 监听 `website/**`、`assets/**` 和 workflow 自身, 构建并上传 `website/dist`。

## 主进程模块

> GH-121: 数据内核 (adapters / engine / adapter-registry+manifest / 根级中立件 / shared) 物理位于 `packages/berth-scan-engine/src/`, 下文以 `pkg:` 前缀指代该目录; 模块职责与分层规则不变。

- `pkg:adapters/` — Agent 适配器, 经 `index.ts` 暴露, 类型见 `types.ts`。v0.1 覆盖 Claude Code 与 Codex:
  - `claude-code/index.ts` — 适配器入口
  - `claude-code/scanner.ts` — 25+ 资产类型扫描器
  - `claude-code/parsers.ts` — YAML/JSON/Markdown 解析、@path 导入链解析
  - `codex/index.ts` / `codex/parsers.ts` — Codex config、hooks、agents、skills、rollout session 解析
- `pkg:engine/` — 资产引擎:
  - `agent-capabilities.ts` — engine 消费 per-agent 知识的单一漏斗 (GH-115): 聚合各 adapter 的 `sources.ts` 项目级扫描源声明; shallow-conventions / derive-asset / watcher 由其派生表, 不再各自维护 mirror。接入新 agent: 建 `adapters/<agent>/sources.ts` + 此处登记一行
  - `session-detail.ts` — session/模型推断域逻辑 (GH-115 自 ipc/handlers 迁入): `buildSessionDetail` 编排 + `toSessionSummary` 单源 + `KNOWN_MODEL_METADATA` 模型知识库 (新模型补条目); detail 解析按文件指纹缓存 (GH-116)
  - `session-replay.ts` — 会话重放编排 (GH-116): `buildSessionReplay` (per-agent `adapters/*/session-replay.ts` 解析 + AssetFileCache 指纹缓存 + 20k 事件 cap) + `readSessionReplayEventPayload` (事件 id→JSONL 行按需反查, 正文不全量过 IPC)
  - `session-activity.ts` — session 活动指标纯函数
  - `assets/runtime.ts` — 中心资产运行时 (GH-122 拆协作者后为状态机 + 数据提交 + 查询门面 + 编排): 维护 `AssetSnapshot`/`AssetRuntimeStatus`; IPC 派生数据经此读取。协作者: `assets/selector-cache.ts` (snapshot.id 键派生缓存) · `assets/project-snapshot-cache.ts` (per-project 快照缓存, 归一键内聚) · `assets/scan-coordinator.ts` (scanner 生命周期 + in-flight 去重 + R4 代际 guard; 链 ③ 调度/背压落点)
  - `assets/worker-host.ts` / `assets/worker.ts` — main process 的 worker_threads 边界; 大文件枚举、JSONL parse 与 adapter `scanAll()` 在 worker 中执行
  - `assets/file-cache.ts` — 进程内 file fingerprint cache, 基于 `path + size + mtimeMs` 复用 Claude session / Codex rollout metadata; 不写磁盘
  - `scanner.ts` — adapter 扫描编排, 供 worker job 使用
  - `watcher.ts` — chokidar 文件监听
  - `search.ts` — MiniSearch 全文索引
  - `relations.ts` — 资产关系解析
  - `assets/snapshot-store.ts` / `assets/sqlite-snapshot-store.ts` — 资产快照持久层 (同 `SnapshotStore` 契约 drop-in): JSON store (单测注入目录) 与行级 SQLite store (`berth-index.db`, WAL, 一资产一行, 主进程注入 better-sqlite3); 冷启动从持久快照 SWR 恢复 (GH-113 I3)
- `src/main/memory/` — 记忆聚合 (只读): `index.ts` `listMemory()` 跨源聚合; `sources/united-memory.ts` + `sources/claude-native.ts` 列出 United Memory 与 Claude 原生记忆 notes; 类型 `types.ts`
- `src/main/agent-teams/` — Agent Teams 运行时协作记录 (只读, GH-114): `listAgentTeams()` 解析 `~/.claude/teams/{name}/` (config.json + inboxes) 与 `~/.claude/tasks/{name}/`; 与 memory/ 同型的按需 IPC 域 (`teams:list`), 刻意不进 asset model / scanner / watcher / search — teams 目录是 Claude Code 运行时生成、cleanup 即删的状态, UI 以"协作记录"口径呈现, 不声称实时
- Agent 能力插件注册表 (跨 main/包两侧, GH-121):
  - `src/main/agent-plugins/registry.ts` — 内置 capability plugin 与有效 manifest plugin 的统一列表 (留 main, UI 域)
  - `src/main/agent-plugins/descriptors.ts` — 聚合 re-export 包内 adapters 的 descriptor (留 main)
  - `pkg:agent-plugins/manifest.ts` — plugin manifest 发现、校验与 `path + size + mtimeMs` 进程内缓存 (adapter-registry 依赖, 随闭包进包)
  - `pkg:agent-plugins/adapter-registry.ts` — worker 扫描 adapter 构造入口, 当前只执行内置 adapter, 第三方 manifest adapter 只读元数据
- `src/main/project-scope-runtime.ts` — project scope 切换时更新中心 runtime 的 `projectDir`, 刷新 snapshot, 并重启 watcher。
- `src/main/ipc/` — IPC 薄门面: `handlers.ts` 按域分五个注册函数 (window/system/asset/session/domain), `index.ts` 统一装配。handler 只做薄读 (runtime selector / engine 单调用), 域逻辑禁止驻留 (GH-115: session 推断已迁 engine/session-detail)。
- `pkg:log.ts` — 日志 seam (GH-115): 纯 fs 滚动文件工厂 (electron-free **根级中立件**) + 组合根装配; 仅落 `userData/logs` 本地, 无遥测。进程级兜底 (uncaughtException/unhandledRejection/render-process-gone/whenReady catch) 在 src/main/index.ts。
- `pkg:adapters/{claude-code,codex}/sources.ts` + `descriptors.ts` — per-agent 扫描源与 descriptor **数据声明归 adapter 侧** (GH-115 解 adapters↔agent-plugins 值依赖环); main 侧 `agent-plugins/descriptors.ts` 仅聚合 re-export。
- `pkg:shared/object-guards.ts` — 无 node 依赖纯守卫单源 (isRecord/readString 族/safeId/extractAtImports); `adapters/_shared/parser-helpers.ts` 为兼容 re-export。`pkg:shared/path-utils.ts` 含 `samePath` 与 `isPathInside({includeEqual})` 两个平台感知比较单源。

## 渲染进程模块

`src/renderer/src/` 下: `components/{layout,shared,ui}`、`pages`、`stores` (Zustand)、`hooks`、`i18n` (en/zh)、`lib`、`styles`。

- **UI 设计系统 (GH-105)**: `components/ui/` 是唯一 primitive 入口 — re-export HeroUI v2 组件 + berth composite (语义 `Chip`、`motion` token)。页面与 `shared/` 领域组件只从 `@/components/ui` 引入, 不直接 import `@heroui/react`。`shared/` 是建在 `ui/` 之上的领域 composite。HeroUI v2 经 `heroui()` Tailwind 插件接入 (Tailwind 3.4, `@heroui/theme` 为直接 devDep 满足 pnpm 解析 + content glob); App 由 `HeroUIProvider` (navigate/locale/reducedMotion) 包裹。
- **主题 / 强调色**: `components/theme-provider.tsx` 在 `documentElement` toggle `.dark` (亮/暗/系统, localStorage `berth-theme`, 同步 `window.api.theme.set`) 并设 `data-accent` (可切换强调色, localStorage `berth-accent`)。`styles/globals.css` 用 HSL CSS 变量 (shadcn 命名) + `html[data-accent]` 块同时驱动 berth `--primary` 与 HeroUI `--heroui-primary`; `--chart-*` 为图表分类色, 独立维护。
- `hooks/use-ipc.ts` — `useAssetRuntime()` 负责启动 runtime refresh、同步 snapshot/status; 页面数据 hook 只读 selector IPC。`useSessions()` 与 `useAgentCapabilityPlugins()` 使用 stale-while-refresh 缓存, 本地已有数据时立即展示并后台刷新。
- `stores/app.ts` — 资产快照唯一写落点是 `setAssetSnapshot`/`applyAssetProgress` (foldKeepingShallow 防闪烁不变量, GH-115 起裸替换 action 已删除、类型层不可绕); 另存全局 UI 态 (sidebar/search/scope/inspector)。列表数据不进 store, 走 hooks 层 SWR 缓存。`scanning` 不是字段, 读处由 `assetRuntimeStatus.state` 派生。
- Overview 使用局部 skeleton: metrics、recent sessions、usage、health worklist 独立 loading/stale/error, 不使用全屏扫描遮罩。

## IPC 契约 (GH-115 单源派生)

- 渲染层经 preload 暴露的 API 调用主进程; `contextIsolation: true`, `nodeIntegration: false`。
- **单一真源链**: `pkg:shared/types/ipc.ts` 的 `IpcChannels`/`IpcEvents` 表 → preload 经 typed `invoke/subscribe` 派生 → `window.api` 类型 = preload 的 `export type BerthAPI = typeof api` (index.d.ts 仅 13 行派生声明, **禁止手写方法签名**)。
- **四方对账强制** (`tests/unit/ipc-contract.test.ts` + `tests/unit/ipc-registration.test.ts`): handlers 注册 == preload invoke == IpcChannels 键集 == tests/setup.ts mock 键结构; 通道增删必须四方同批, 不一致即红。
- **IpcEvents payload 必须对实发 site 核验** (改表先查 `webContents.send` 调用点): maximized-change 实发裸 boolean, assets:changed 实发 WatchEvent, assets:progress 实发 AssetProgressPayload。
- 资产 runtime IPC:
  - `assets:snapshot` — 立即返回当前 `AssetSnapshot`
  - `assets:status` — 立即返回 `AssetRuntimeStatus`
  - `assets:refresh` — 触发 runtime refresh, 支持 `{ wait?: boolean }`
  - `assets:scan-all` — 兼容旧调用, 内部委托 runtime `legacy-scan-all`

## 数据模型

- Asset model (`pkg:shared/types/asset.ts`): 统一资产表示。
- Scope merge: user / project / enterprise 配置合并展示规则。

## 分层与依赖规则 (GH-115)

主进程分层 (上层可依赖下层, 反向即违规):

| 层 | 内容 | 物理位置 (GH-121) |
|---|---|---|
| main-composition | `index.ts` / `dev-instance.ts` / `devtools.ts` (electron 装配、进程钩子) | src/main |
| main-ipc | `ipc/` 薄注册门面 (可用 electron) | src/main |
| main-domains | `memory/` / `agent-teams/` 按需只读 IPC 域 (不进 asset/scanner/watcher 管线) | src/main |
| main-agent-plugins | `agent-plugins/` registry+descriptors 聚合 (UI 域) | src/main |
| engine | `engine/` 领域核 (runtime/scanner/watcher/search/health/pricing/session-detail/agent-capabilities) | pkg |
| pkg-agent-plugins | `agent-plugins/` adapter-registry+manifest (worker 扫描入口) | pkg |
| adapters | `adapters/` per-agent 知识 (scanner/parsers/descriptors/sources + `_shared`) | pkg |
| 根级中立件 | `agent-homes` / `project-config-roots` / `project-scope` / `log` (electron-free, 双侧可依赖) | pkg |
| shared | `shared/` 跨进程纯类型+纯函数 (最底层) | pkg |

依赖方向恒为 **src/main → @berth/scan-engine (pkg)**, 包内零 electron import、零对 src 的反向引用 (GH-121 起 root typecheck 纳管包源码, 断链即红)。

规则:
1. IPC 通道增删四方同批 (handlers/preload/IpcChannels/mock), 对账测试强制。
2. `window.api` 类型唯一来源 = preload `BerthAPI = typeof api`。
3. electron 值 import 白名单: `index.ts`、`dev-instance.ts`、`devtools.ts`、`ipc/`; 其余模块出现即违规。
4. 依赖方向: agent-plugins → adapters → shared 单向; adapters 禁止 import engine/agent-plugins; engine 对 adapter 的新访问一律经 `engine/agent-capabilities.ts` 漏斗, 存量直连只减不增。
5. 纯函数归属: 无 node 依赖 → `src/shared`; 有 node 依赖且仅 adapters 域内 → `adapters/_shared`; **非 adapters 模块禁止 import `adapters/_shared`** (需要的先升 shared)。
6. renderer 准入: `@heroui/react` 仅 `components/ui/`; `components/shared/` 准入 ≥2 页消费, 单页专属住 `components/<feature>/`; 页面内联无 React 依赖纯逻辑 >~50 行下沉 `lib/` 配直测。成品语义 composite (如 `ScopeBadge`/`Collapsible`) 把表现焊进组件、只暴露语义 prop (scope/open/tone), **不暴露改外观 (radius/间距/颜色) 的 `className` 逃生舱** — 表现固定在组件内, 不靠调用点传一致 className (GH-136: 收敛来源 ≠ 约束表现; className 暴露给"内容容器"可以, 给"组件机制"会漂移)。
7. store 资产写路径唯一 `setAssetSnapshot` (fold 不变量); 禁止新增裸替换 action。
8. 错误处理: 禁止裸 catch 吞错 — 转 ScanError/HealthCheck 记账或调 `log(scope, err)`; 日志仅落 `userData/logs`, 禁止网络出口。
9. 删除纪律: 删代码同批连带专属测试 / setup.ts mock / i18n key / README 声明; 触碰被源码文本断言钉住的文件时同批改写为行为断言。
10. 打包语义: electron-builder `files` 加法白名单; `dependencies` 仅 main/preload 运行时依赖 (renderer 库一律 devDependencies)。

**例外清单** (现存违例, 收口归属; 新例外必须在此登记):

| 例外 | 内容 | 收口 issue |
|---|---|---|
| engine→adapters 直连 (conventions) | shallow-conventions 与 derive-asset 的 conventions 解析 (有意的表示模型分叉: shallow 单资产+readByAgentIds vs derive 双 agent 双资产) | engine-shared-core-package |
| engine→adapters 直连 (session 解析) | engine/session-detail → 两家 session parser; engine/session-replay → 两家 session-replay parser; engine/assets/derive-asset → 两家 session-meta parser + readCodexSessionTitleIndex (GH-141 session 增量, 同族) (GH-116; capability map 的 parseSessionDetail/Replay 维度待契约化) | engine-shared-core-package |
| engine→adapters 直连 (health/watcher) | health → parseCodexToml; watcher → resolveClaudeManagedDir | health-restructure / engine 包切线 |
| adapter scanAll 散落调用 | claude scanner 未接 sources 单表 (settings.local.json 2/5-parser 分叉如实保留) | engine-shared-core-package |
| hooks-manager 写能力 | engine 唯一合法写者 (用户 hook 开关), 与包 read-only 承诺冲突 | engine 成包时留宿主 |
| memory splitFrontmatter ×2 | 与 _shared 版 5 点语义差, characterization 已钉 | engine-shared-core-package |
| agent-plugins/manifest 本地守卫 | readString 带 trim 返回, 与 shared 版语义有差 | 不收敛 (语义不同) |

## 安全约束 (硬边界)

- 只读用户配置: 不修改被扫描的 agent 配置/会话文件。唯一本地写入是 berth 自有的资产索引缓存 `berth-index.db` (SQLite 快照持久化, 支持冷启动 SWR; GH-113 I3), 不触及用户数据。
- 进程内 file-cache (`assets/file-cache.ts`) 不落磁盘; 落盘的只有上述 berth 自有索引缓存。
- 凭证隔离: OAuth token / API key 不进渲染进程, 仅探测存在性, 标记 `sensitive: true`。
- 路径白名单: 扫描器仅访问预定义路径 (见 `pkg:adapters/claude-code/scanner.ts`); shell 出口同享该边界 (GH-119 url-guard: openPath 限扫描根 ∪ memory 根 ∪ 活动项目)。
- 无遥测: 数据不出本机。

## 技术栈

Electron 33 (electron-vite 5) · React 19 + TS · Tailwind 3 + HeroUI v2 (React Aria + framer-motion) · Zustand · react-router-dom 7 · Recharts · i18next · MiniSearch · better-sqlite3 · chokidar · Vitest · Playwright。Website 使用 Vite React SSG, 由 GitHub Pages 发布。

## 相关

- 工作流: `.agents/README.md`
- 任务态: `docs/works/` · 摩擦: `docs/friction/` · 产品问题: `docs/issues/`
