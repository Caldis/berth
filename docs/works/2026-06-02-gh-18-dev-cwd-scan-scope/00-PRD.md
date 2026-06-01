# PRD 快照 (只读)

来源:

- Local issue: `docs/issues/2026-05-30-IMPROVEMENT-dev-cwd-scan-scope.md`
- GitHub issue: https://github.com/Caldis/berth/issues/18

## 正文

# 描述

- berth dev 模式下 main 进程以 `process.cwd()` (= 项目根) 作为 projectDir 传给 scanner 与 watcher
  (`src/main/index.ts`: `initScanner(process.cwd())` / `watcher.start(process.cwd())`)。低优先, 非阻塞。

# GitHub

- Issue: https://github.com/Caldis/berth/issues/18
- Number: #18

# 重现步骤

- `pnpm dev` 在 berth 仓库根启动

# 预期结果

- dev 模式扫描/监听的是“被检视的 Claude 资产目录”, 与 berth 自身仓库解耦

# 实际结果

- scanner 经 ClaudeCodeAdapter(projectDir) 读取 `<projectDir>/.claude` 资产; watcher 监听
  `<projectDir>/.claude` 与 `<projectDir>/.mcp.json`。berth 仓库根无 `.claude` / `.mcp.json`,
  故当前实际只读到 `~/.claude` (全局), 对项目文件无写入、无破坏 (已核实 watcher 仅 emit 事件、
  scanner 只读)。属 cosmetic: 生产模式 cwd 为 app 资源目录, dev 模式 cwd 恰为仓库根, 语义不纯。

# 解决方案

- 待办 (低优): dev 模式下让 projectDir 取一个显式的“被检视目录”配置, 而非裸用 `process.cwd()`;
  或在 dev 下省略 projectDir (仅扫全局 `~/.claude`)。
- 不阻塞交接: 当前行为只读且无副作用, 已确认不会触碰/修改仓库文件。

