# 描述
- berth dev 模式下 main 进程以 `process.cwd()` (= 项目根) 作为 projectDir 传给 scanner 与 watcher
  (src/main/index.ts: initScanner(process.cwd()) / watcher.start(process.cwd()))。低优先, 非阻塞。

# 状态

Resolved

# 完成日期

2026-06-02

# GitHub
- Issue: https://github.com/Caldis/berth/issues/18
- Number: #18

# 重现步骤
- `pnpm dev` 在 berth 仓库根启动

# 预期结果
- dev 模式扫描/监听的是"被检视的 Claude 资产目录", 与 berth 自身仓库解耦

# 实际结果
- scanner 经 ClaudeCodeAdapter(projectDir) 读取 `<projectDir>/.claude` 资产; watcher 监听
  `<projectDir>/.claude` 与 `<projectDir>/.mcp.json`。berth 仓库根**无** .claude/.mcp.json,
  故当前实际只读到 `~/.claude` (全局), 对项目文件无写入、无破坏 (已核实 watcher 仅 emit 事件、
  scanner 只读)。属 cosmetic: 生产模式 cwd 为 app 资源目录, dev 模式 cwd 恰为仓库根, 语义不纯。

# 解决方案
- 当前代码已通过 `src/main/project-dir.ts#resolveDefaultProjectDir()` 在 dev 模式下返回 `undefined`, main 进程把该值传给 scanner 和 watcher, 因此不再把 berth 仓库根当作项目扫描范围。
- 验证:
  - `pnpm test -- tests/unit/project-dir.test.ts tests/unit/watcher.test.ts`
  - `pnpm typecheck:node`
  - `pnpm harness:check --work docs/works/2026-06-02-gh-18-dev-cwd-scan-scope`
- 任务归档: `docs/works/_archive/2026-06-02-gh-18-dev-cwd-scan-scope/`
