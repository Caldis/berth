# 工具索引

berth 项目自用工具 (不含企业内部设施)。Agent 据此主动获取上下文与执行验证。

## 版本控制
- `git` — 版本操作; 提交规范见根 AGENTS.md。
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
- `pnpm harness:check` / `pnpm harness:sync` — harness 自检与分发。

## 项目地图
- `docs/ARCHITECTURE.md` — 进程/模块边界、IPC 契约、安全约束。
