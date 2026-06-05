# berth 架构 (Project Map)

面向 Agent 的项目地图。渐进式披露的入口之一, 详见各模块源码。

## 进程边界

- `src/main/` — Electron 主进程 (Node.js)。文件系统访问、扫描、IPC handler。
- `src/preload/` — contextIsolation 预加载桥, 暴露受控 API 给渲染层。
- `src/renderer/src/` — React 19 应用 (UI)。无直接 Node 访问。
- `src/shared/` — 跨进程共享类型 (Asset model, IPC 契约)。

## 仓库布局

- `assets/` — 仓库共享静态资产。README 直接引用; website 构建后由 `website/scripts/postbuild.mjs` 复制到 `website/dist/assets/`。
- `docs/` — 冷文档与 harness 操作态: 架构、用户手册、PRD、issues、friction、works。这里不放官网入口 HTML 或共享图片资产。
- `website/` — 官方网站源码, React SSG 多语言静态站。`website/index.html` 是官网入口; `website/public/` 放只属于官网发布的静态文件。
- `.github/workflows/` — CI 与 GitHub Pages 部署。`deploy-website.yml` 监听 `website/**`、`assets/**` 和 workflow 自身, 构建并上传 `website/dist`。

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

- **UI 设计系统 (GH-105)**: `components/ui/` 是唯一 primitive 入口 — re-export HeroUI v2 组件 + berth composite (语义 `Chip`、`motion` token)。页面与 `shared/` 领域组件只从 `@/components/ui` 引入, 不直接 import `@heroui/react`。`shared/` 是建在 `ui/` 之上的领域 composite。HeroUI v2 经 `heroui()` Tailwind 插件接入 (Tailwind 3.4, `@heroui/theme` 为直接 devDep 满足 pnpm 解析 + content glob); App 由 `HeroUIProvider` (navigate/locale/reducedMotion) 包裹。
- **主题 / 强调色**: `components/theme-provider.tsx` 在 `documentElement` toggle `.dark` (亮/暗/系统, localStorage `berth-theme`, 同步 `window.api.theme.set`) 并设 `data-accent` (可切换强调色, localStorage `berth-accent`)。`styles/globals.css` 用 HSL CSS 变量 (shadcn 命名) + `html[data-accent]` 块同时驱动 berth `--primary` 与 HeroUI `--heroui-primary`; `--chart-*` 为图表分类色, 独立维护。
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

Electron 33 (electron-vite 5) · React 19 + TS · Tailwind 3 + HeroUI v2 (React Aria + framer-motion) · Zustand · react-router-dom 7 · Recharts · i18next · MiniSearch · better-sqlite3 · chokidar · Vitest · Playwright。Website 使用 Vite React SSG, 由 GitHub Pages 发布。

## 相关

- 工作流: `.agents/README.md`
- 任务态: `docs/works/` · 摩擦: `docs/friction/` · 产品问题: `docs/issues/`
