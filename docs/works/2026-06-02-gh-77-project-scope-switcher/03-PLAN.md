# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。

- [x] 任务 1: 新增应用级 scope 类型、路径规范化 helper、store 状态
  - tests: `pnpm test tests/unit/scope.test.ts tests/renderer/app-store.test.ts` (8 passed); `pnpm typecheck:web`; `pnpm typecheck:node`
  - verify: 非 UI; `global` / `user` / `project` 三种状态可表达, project scope 会规范化 path/pathKey; 空 project path 回退 global; Windows 路径大小写归一并去重。
- [x] 任务 2: 主进程生成项目候选, sessions/usage 接受精确 project path
  - tests: `pnpm test tests/unit/project-scope.test.ts tests/unit/usage-summary.test.ts tests/unit/engine-scanner.test.ts` (21 passed); `pnpm typecheck:node`; `pnpm typecheck:web`
  - verify: 非 UI; `projectScopeCandidatesFromAssets()` 从当前 projectDir 与历史 session 合并候选并去重; `sessions:list` / `usage:summary` 接受 `projectPath`, 精确匹配规范化路径, 不使用模糊项目名。
- [x] 任务 3: 侧边栏增加 Project Scope Switcher
  - tests: `pnpm test tests/renderer/project-scope-switcher.test.tsx tests/renderer/sidebar-agent-view.test.tsx tests/renderer/app-store.test.ts` (13 passed); `pnpm typecheck:web`
  - verify: UI; `pnpm dev:agent start --id gh77-project-scope-ui --debug-port 9336 --json`, Playwright CDP 打开 `项目范围` 弹层并选择 `用户域`; 截图 `C:/Users/mail/AppData/Local/Temp/berth-gh77-project-scope-open.png` 与 `C:/Users/mail/AppData/Local/Temp/berth-gh77-project-scope-collapsed-open.png` 覆盖 expanded/collapsed sidebar。入口位于侧边栏 footer, 与 Agent selector 区分; 弹层有 global/user/project 分组、长路径截断、loading/empty/error/focus 状态。
- [x] 任务 4: Overview / Sessions / Usage 消费应用级 scope
  - tests: `pnpm test tests/unit/scope.test.ts tests/renderer/sessions-pages.test.tsx` (26 passed); `pnpm typecheck:web`
  - verify: Renderer; `projectPathForScope()` 只在 project scope 返回路径; Overview recent sessions、Overview 7 天 usage、Sessions list、Usage summary 在 project scope 下都向 IPC 传递精确 `projectPath`; global/user scope 不传 project path, 保持旧行为。主进程精确路径过滤证据见任务 2。稳定 Electron e2e 仍留到任务 7, 避免依赖本机历史会话 fixture。
- [x] 任务 5: Instructions / Capabilities 在应用级 scope 下过滤资产
  - tests: `pnpm test tests/unit/scope.test.ts tests/unit/project-scope.test.ts tests/renderer/instructions-guidance.test.tsx tests/renderer/capabilities-guidance.test.tsx` (21 passed); `pnpm typecheck:node`; `pnpm typecheck:web`
  - verify: Renderer; `filterAssetsByAppScope()` 支持 global/user/project 三种应用 scope。project scope 下保留 user/enterprise 基础层级, 仅展示路径匹配的 project/session 资产; Instructions skills 与 Capabilities hooks 已覆盖当前项目资产保留、其它项目资产隐藏。页面内 asset scope filter 继续叠加在应用级 scope 之后。
- [x] 任务 6: 切换 project scope 后处理扫描刷新与过期状态
  - tests: `pnpm test tests/unit/project-scope-runtime.test.ts tests/unit/watcher.test.ts tests/renderer/project-scope-switcher.test.tsx` (10 passed); `pnpm typecheck:node`; `pnpm typecheck:web`
  - verify: 非 UI; `project-scope:activate` 会按选择的项目路径重建 scanner, 扫描后重建 search index, 并重启 watcher。切回 global/user 时清空 projectDir, 避免继续沿用上一项目扫描上下文。renderer 选择 scope 成功后同步写入 assets/stats/project candidates, 再更新 scope selection。watcher 已纳入项目 `CLAUDE.md`、`AGENTS.md`、`.codex` 与 `.agents/skills` 路径。
- [x] 任务 7: 视觉和交互验收
  - tests: `pnpm test tests/renderer/project-scope-switcher.test.tsx` (5 passed); `pnpm build`; `pnpm test:e2e tests/e2e/project-scope.e2e.ts` (1 passed)
  - verify: UI; `tests/e2e/project-scope.e2e.ts` 使用临时 `CODEX_HOME` 和项目 skill fixture, 实测打开项目范围、键盘 Escape 关闭、选择项目后搜索索引能找到项目 skill, 切回用户域后项目 skill 从搜索结果消失。真实 Electron `dev:agent` 实例 `gh77-project-scope-final` 使用 CDP 打开弹层, `print-window` 截图 expanded/collapsed: `C:/Users/mail/AppData/Local/Temp/berth-gh77-project-scope-final-expanded.png`, `C:/Users/mail/AppData/Local/Temp/berth-gh77-project-scope-final-collapsed.png`; guard after 返回 `guard-ok`, 窗口控制区未被遮挡。
- [ ] 任务 8: harness verify / archive
  - tests: `pnpm harness:check --work docs/works/2026-06-02-gh-77-project-scope-switcher`; `node scripts/harness-projects.mjs check --strict`; `pnpm harness:prepush`
  - verify: 非 UI; 所有实现测试和 UI 验收通过后, `harness-projects done`, 移动到 `_archive`, 推送并等待 CI。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
