# berth 架构 (Project Map)

面向 Agent 的项目地图。渐进式披露的入口之一, 详见各模块源码。

## 进程边界

- `src/main/` — Electron 主进程 (Node.js)。文件系统访问、扫描、IPC handler。
- `src/preload/` — contextIsolation 预加载桥, 暴露受控 API 给渲染层。
- `src/renderer/src/` — React 19 应用 (UI)。无直接 Node 访问。
- `src/shared/` — 跨进程共享类型 (Asset model, IPC 契约)。

## 主进程模块

- `src/main/adapters/` — Agent 适配器, 经 `index.ts` 暴露, 类型见 `types.ts`。v0.1 仅 Claude Code:
  - `claude-code/index.ts` — 适配器入口
  - `claude-code/scanner.ts` — 25+ 资产类型扫描器
  - `claude-code/parsers.ts` — YAML/JSON/Markdown 解析、@path 导入链解析
- `src/main/engine/` — 资产引擎:
  - `scanner.ts` — 全量 + 增量扫描编排
  - `watcher.ts` — chokidar 文件监听
  - `search.ts` — MiniSearch 全文索引
  - `relations.ts` — 资产关系解析
- `src/main/ipc/` — IPC handler: `handlers.ts` (实现) + `index.ts` (注册)。

## 渲染进程模块

`src/renderer/src/` 下: `components/{layout,shared,ui}`、`pages`、`stores` (Zustand)、`hooks`、`i18n` (en/zh)、`lib`、`styles`。

## IPC 契约

- 渲染层经 preload 暴露的 API 调用主进程; `contextIsolation: true`, `nodeIntegration: false`。
- 契约类型定义于 `src/shared/types/ipc.ts`; 资产模型于 `src/shared/types/asset.ts`。
- 修改 ipc handler 须同步更新 `src/shared/types/ipc.ts`。

## 数据模型

- Asset model (`src/shared/types/asset.ts`): 统一资产表示。
- Scope merge: user / project / enterprise 配置合并展示规则。

## 安全约束 (硬边界)

- 只读: v0.1 不写任何本地文件。
- 凭证隔离: OAuth token / API key 不进渲染进程, 仅探测存在性, 标记 `sensitive: true`。
- 路径白名单: 扫描器仅访问预定义路径 (见 `adapters/claude-code/scanner.ts`)。
- 无遥测: 数据不出本机。

## 技术栈

Electron 33 (electron-vite 5) · React 19 + TS · Tailwind/shadcn · Zustand · react-router-dom 7 · Recharts · i18next · MiniSearch · better-sqlite3 · chokidar · Vitest · Playwright。

## 相关

- 工作流: `.agents/README.md`
- 任务态: `docs/works/` · 摩擦: `docs/friction/`
