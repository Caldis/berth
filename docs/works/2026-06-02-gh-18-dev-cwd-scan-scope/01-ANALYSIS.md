# 需求分析 (Explore 产物)

## 现状理解

- `src/main/index.ts` 不再直接把 `process.cwd()` 传给 scanner/watcher。当前路径为:
  - `const projectDir = resolveDefaultProjectDir({ isDev: is.dev, cwd: process.cwd() })`
  - `initScanner(projectDir)`
  - `watcher.start(projectDir)`
- `src/main/project-dir.ts` 的当前实现是 `isDev ? undefined : cwd`。因此 dev 模式下 `projectDir` 为 `undefined`, 不会把 berth 仓库根当作被检视目录。
- `src/main/engine/watcher.ts#getAssetWatchPaths()` 只有在 `projectDir` 存在时才添加 `<projectDir>/.claude` 与 `<projectDir>/.mcp.json`。
- `src/main/engine/scanner.ts#AssetScanner` 会把 `projectDir` 传给 Claude Code / Codex adapter。dev 模式传 `undefined` 后, adapter 只扫描全局/配置来源和从 session 推导出的项目候选, 不把 berth 仓库根当作当前项目。
- 已有测试 `tests/unit/project-dir.test.ts` 覆盖 dev 模式省略 project scope, `tests/unit/watcher.test.ts` 覆盖 watcher 仅在显式 projectDir 时加入项目路径。

## 关联与依赖

- 这是 main 进程启动参数问题, 不涉及 renderer UI、IPC 契约或用户配置写入。
- `getScanner()` 的懒初始化仍使用 `new AssetScanner(process.cwd())`, 但正常应用启动路径会在窗口创建前调用 `initScanner(projectDir)`。当前 issue 指向 `pnpm dev` 主路径, 已被 `resolveDefaultProjectDir` 修正覆盖。
- 生产模式仍使用 `cwd`。这不是本 issue 范围; 生产路径后续若要改为用户选择的 scan root, 应放到 Settings / scan source 设计中处理。

## 验收标准

1. dev 模式下 `resolveDefaultProjectDir({ isDev: true, cwd })` 返回 `undefined`。
2. main 进程启动时 scanner 与 watcher 使用 `resolveDefaultProjectDir` 的返回值, 不再裸传 `process.cwd()`。
3. watcher 在 `projectDir === undefined` 时不添加 berth 仓库根下的 `.claude` / `.mcp.json`。
4. 现有测试能证明 dev 路径不会扫描当前仓库 cwd。

## 界面质量与交互验收

不适用。此任务只处理 main 进程扫描范围与 watcher 输入。

## 未决问题

无。当前代码已满足 #18 的预期结果, 本任务只补齐验证与 issue 归档记录。
