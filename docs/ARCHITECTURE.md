# berth 架构 (Project Map)

面向 Agent 的项目地图。渐进式披露的入口之一, 详见各模块源码。

## 进程边界

- `src/main/` — Electron 主进程 (Node.js)。文件系统访问、扫描、IPC handler。
- `src/preload/` — contextIsolation 预加载桥, 暴露受控 API 给渲染层。
- `src/renderer/src/` — React 19 应用 (UI)。无直接 Node 访问。
- `src/shared/` — 跨进程共享类型 (Asset model, IPC 契约)。

## 主进程模块

- `src/main/adapters/` — Agent 适配器, 经 `index.ts` 暴露, 类型见 `types.ts`。v0.1 覆盖 Claude Code 与 Codex:
  - `claude-code/index.ts` — 适配器入口
  - `claude-code/scanner.ts` — 25+ 资产类型扫描器
  - `claude-code/parsers.ts` — YAML/JSON/Markdown 解析、@path 导入链解析
  - `codex/index.ts` / `codex/parsers.ts` — Codex config、hooks、agents、skills、rollout session 解析
- `src/main/engine/` — 资产引擎:
  - `assets/runtime.ts` — 中心资产运行时, 维护 `AssetSnapshot`、`AssetRuntimeStatus`、in-flight refresh 与 selector cache; IPC 派生数据经此读取
  - `assets/worker-host.ts` / `assets/worker.ts` — main process 的 worker_threads 边界; 大文件枚举、JSONL parse 与 adapter `scanAll()` 在 worker 中执行
  - `assets/file-cache.ts` — 进程内 file fingerprint cache, 基于 `path + size + mtimeMs` 复用 Claude session / Codex rollout metadata; 不写磁盘
  - `scanner.ts` — adapter 扫描编排, 供 worker job 使用
  - `watcher.ts` — chokidar 文件监听
  - `search.ts` — MiniSearch 全文索引
  - `relations.ts` — 资产关系解析
- `src/main/agent-plugins/` — Agent 能力插件注册表:
  - `registry.ts` — 内置 capability plugin 与有效 manifest plugin 的统一列表
  - `manifest.ts` — plugin manifest 发现、校验与 `path + size + mtimeMs` 进程内缓存
  - `adapter-registry.ts` — worker 扫描 adapter 构造入口, 当前只执行内置 adapter, 第三方 manifest adapter 只读元数据
  - `descriptors.ts` — Claude/Codex built-in scan source descriptor 单一声明源, registry 与 adapter source coverage 共用
- `src/main/project-scope-runtime.ts` — project scope 切换时更新中心 runtime 的 `projectDir`, 刷新 snapshot, 并重启 watcher。
- `src/main/ipc/` — IPC handler: `handlers.ts` (实现) + `index.ts` (注册)。`sessions:list`、`usage:summary`、`assets:health-check`、`assets:search` 等从中心 runtime selectors 读取。

## 渲染进程模块

`src/renderer/src/` 下: `components/{layout,shared,ui}`、`pages`、`stores` (Zustand)、`hooks`、`i18n` (en/zh)、`lib`、`styles`。

- `hooks/use-ipc.ts` — `useAssetRuntime()` 负责启动 runtime refresh、同步 snapshot/status; 页面数据 hook 只读 selector IPC。`useSessions()` 与 `useAgentCapabilityPlugins()` 使用 stale-while-refresh 缓存, 本地已有数据时立即展示并后台刷新。
- `stores/app.ts` — 保存 `assetRuntimeStatus`、`assetSnapshotId`、`assetErrors` 与旧 `assets/stats` 兼容字段。
- Overview 使用局部 skeleton: metrics、recent sessions、usage、health worklist 独立 loading/stale/error, 不使用全屏扫描遮罩。

## IPC 契约

- 渲染层经 preload 暴露的 API 调用主进程; `contextIsolation: true`, `nodeIntegration: false`。
- 契约类型定义于 `src/shared/types/ipc.ts`; 资产模型于 `src/shared/types/asset.ts`。
- 修改 ipc handler 须同步更新 `src/shared/types/ipc.ts`。
- 资产 runtime IPC:
  - `assets:snapshot` — 立即返回当前 `AssetSnapshot`
  - `assets:status` — 立即返回 `AssetRuntimeStatus`
  - `assets:refresh` — 触发 runtime refresh, 支持 `{ wait?: boolean }`
  - `assets:scan-all` — 兼容旧调用, 内部委托 runtime `legacy-scan-all`

## 数据模型

- Asset model (`src/shared/types/asset.ts`): 统一资产表示。
- Scope merge: user / project / enterprise 配置合并展示规则。

## 安全约束 (硬边界)

- 只读: v0.1 不写任何本地文件。
- 缓存只在进程内存中保存, 不落到磁盘。
- 凭证隔离: OAuth token / API key 不进渲染进程, 仅探测存在性, 标记 `sensitive: true`。
- 路径白名单: 扫描器仅访问预定义路径 (见 `adapters/claude-code/scanner.ts`)。
- 无遥测: 数据不出本机。

## 技术栈

Electron 33 (electron-vite 5) · React 19 + TS · Tailwind/shadcn · Zustand · react-router-dom 7 · Recharts · i18next · MiniSearch · better-sqlite3 · chokidar · Vitest · Playwright。

## 相关

- 工作流: `.agents/README.md`
- 任务态: `docs/works/` · 摩擦: `docs/friction/` · 产品问题: `docs/issues/`
