# BUG 快照 (只读)

> 原始缺陷描述快照。任何阶段不回写。

来源: `issues/2026-05-30-IMPROVEMENT-dev-cwd-scan-scope.md`

## 复现步骤

- `pnpm dev` 在 berth 仓库根启动。

## 期望 vs 实际

期望:
- dev 模式不要把 berth 自身仓库根当作被检视的 Claude 项目目录。

实际:
- `src/main/index.ts` 调用 `initScanner(process.cwd())` 与 `watcher.start(process.cwd())`。
- dev 模式下 `process.cwd()` 是 berth 仓库根, 导致 scanner / watcher 把仓库根作为 project scope 检查。

