# Hook Operation Recovery Center

## 类型

FEATURE

## 状态

Resolved

## GitHub

- Issue: https://github.com/Caldis/berth/issues/13
- Number: #13

## 关联任务

- 来源归档: `docs/works/_archive/2026-06-01-gh-11-claude-hook-soft-disable/`
- 完成归档: `docs/works/_archive/2026-06-02-gh-13-hook-operation-recovery-center/`

## 完成记录

- 完成日期: 2026-06-02
- GitHub Issue: #13 已关闭
- 解决方案: 增加恢复点 IPC / preload 契约、Claude sidecar 恢复点枚举与清理、Hooks 页面恢复中心 UI、状态解释和相关测试。
- 验证: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm harness:check`, `node scripts/harness-projects.mjs check --strict` 均通过。

## PRD

### 背景

Berth 开始支持直接修改 Agent 配置, 例如禁用或恢复单个 Hook。只在 Hook 行内放一个按钮可以完成操作, 但不适合解释历史状态: 哪些 Hook 被 Berth 改过、恢复点在哪里、是否还能恢复、有没有和用户手动修改冲突。

### 目标

- 提供一个集中入口展示 Berth 管理过的 Hook 操作。
- 让用户能看见每个恢复点的来源、Agent、event、matcher、handler type、创建时间和当前可恢复状态。
- 支持从恢复中心执行恢复、清理失效恢复点、打开关联配置文件。
- 对损坏 sidecar、源文件缺失、Hook 已手动恢复等状态给出明确解释。

### 非目标

- 不替代 Git。
- 不做跨机器同步。
- 不自动合并用户手写的不同 Hook 版本。
- 不绕过 Agent 自身的 managed / enterprise 限制。

### 核心场景

- 用户禁用了多个 Hook, 想集中查看哪些仍处于 disabled restore point 状态。
- 用户手动改过 `settings.json`, 想知道 Berth 的恢复点是否还能用。
- 用户不再需要旧恢复点, 想清理 sidecar 中的记录。

### 验收方向

- 设置页或 Hooks 页面有恢复中心入口。
- 恢复点按 Agent / source / event 分组。
- 每条恢复点显示可恢复、已恢复、冲突、损坏、源文件缺失等状态。
- 执行恢复前展示将写入的 source path 和 Hook 摘要。
- 清理操作只影响 Berth sidecar, 不修改 Agent 原始配置。
