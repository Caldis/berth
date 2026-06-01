# 工具索引

berth 项目自用工具 (不含企业内部设施)。Agent 据此主动获取上下文与执行验证。

## 版本控制
- `git` — 版本操作; 提交规范见根 AGENTS.md。
  - 共享工作区只显式 `git add` 本轮处理过的文件; 禁止 `git add -A`、`git add .` 和目录级批量 add。
- `gh` — GitHub CLI (PR / issue / CI 状态), 远端 Caldis/berth。
- `gh project` — 任务看板跟踪 (new 建 item / archive 置 Done)。**前置**: token 需 `project` + `read:project` scope;
  缺失时 `gh auth refresh -h github.com -s project,read:project` (浏览器授权, Agent 不可代办, 须请用户运行)。

## 包与构建
- `pnpm` (钉死 9.x, 见 package.json packageManager) — 依赖与脚本。
- `electron-vite` — 开发/构建 (`pnpm dev` / `pnpm build`)。

## 测试与验证
- `pnpm test` (Vitest) — 单元测试。
- `pnpm test:e2e` (Playwright) — 端到端。
- `run` skill / Playwright `_electron` REPL + 截图 — 启动应用做视觉/交互验收。
- `pnpm lint` / `pnpm typecheck` — 机械检查。
- `pnpm harness:check` / `pnpm harness:check --work docs/works/{task}` / `pnpm harness:sync` — harness 自检与分发。并行任务影响全局检查时, 用 `--work` 只验证当前任务目录; 总验证仍跑全局 `pnpm harness:check`。
- `pnpm harness:projects:check` — 只读审计 GitHub Project 状态; archive 阶段用 `node scripts/harness-projects.mjs done <task-dir>` 强制置 Done 并回读确认。

## 网络与临时文件
- 常规网络检索用 WebSearch/WebFetch; 除非用户明确要求浏览器实测、截图或交互验证, 不打开 GUI 浏览器抓网页。
- 临时文件写 `$env:TEMP` / `os.tmpdir()` 或已约定的忽略目录; Windows 不用 `/tmp`, 也不把临时截图写进项目目录。

## 项目地图
- `docs/ARCHITECTURE.md` — 进程/模块边界、IPC 契约、安全约束。
