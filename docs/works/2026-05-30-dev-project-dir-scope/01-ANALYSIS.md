# 需求分析 (Explore 产物)

## 现状理解

本问题影响 Electron 主进程初始化路径, 不涉及 renderer、preload 或 IPC 类型变更。

- `src/main/index.ts` 在 app ready 后初始化 scanner 与 watcher。
- `initScanner(projectDir?)` 会把 `projectDir` 传给 `ClaudeCodeAdapter`。
- `watcher.start(projectDir?)` 会监听 `projectDir/.claude` 与 `projectDir/.mcp.json`。
- `projectDir` 省略时, scanner / watcher 仍会读取用户级 `~/.claude` 与 `~/.claude.json`, 不会检查项目级路径。

issue 已说明当前行为只读且无破坏性, 属低优先级语义修复。最小修复是 dev 模式下不传项目目录, 避免把 berth 仓库根误判为被检视项目; 生产模式暂时保持现有 `process.cwd()` 行为, 避免扩大影响面。

## 关联与依赖

- `src/main/engine/scanner.ts`: `initScanner(projectDir?: string)` 已支持省略参数。
- `src/main/engine/watcher.ts`: `start(projectDir?: string)` 已支持省略参数。
- `@electron-toolkit/utils` 的 `is.dev` 已在 `src/main/index.ts` 使用。

## 验收标准

1. dev 模式传给 scanner / watcher 的 projectDir 为 `undefined`。
2. 非 dev 模式保持使用当前工作目录作为 projectDir。
3. 修复有单元测试覆盖, 不依赖启动 Electron 窗口。
4. 不修改已有未提交改动文件。

## 未决问题

无。issue 已给出可接受方案: dev 下省略 projectDir。

