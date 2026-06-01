# Capabilities Status Line Unreachable

## 类型

BUG

## 状态

Fixed

## 完成日期

2026-06-02

## 背景

用户指出“能力”页面里的“状态栏”功能看起来不可用。只读核对后, 当前实现确实很容易让这个 tab 长期为空。

## 已验证事实

- UI 已暴露 `Capabilities -> Status Line` tab, 并只展示 `type === 'statusline'` 的资产。
- 共享类型里已有 `statusline` asset type。
- Claude Code scanner 当前只扫描 `~/.claude/statusline*` 文件, 并把文件本身包装成 `statusline` 资产。
- Claude Code 当前官方配置入口是 `settings.json` / project settings 中的 `statusLine` 字段, 还支持 `subagentStatusLine`。
- 本机 `~/.claude/settings.json` 存在 `statusLine`, 但 `~/.claude/statusline*` 未发现可扫描文件, 因此当前实现不会产生状态栏资产。
- Codex adapter 当前没有任何 `statusline` 资产解析路径。
- 现有测试只覆盖 hook flatten、session 扫描、subagent 扫描等, 没有覆盖 `statusLine` / `subagentStatusLine` 配置解析。

## 重现步骤

- 在 `~/.claude/settings.json` 配置 `statusLine`。
- 打开应用的 `能力 -> 状态栏`。
- 观察 tab 计数和内容。

## 预期结果

- 如果 Claude Code 配置了 `statusLine`, 应展示一条状态栏能力资产, 包含作用域、来源文件、命令类型、命令路径或 inline command 摘要。
- 如果配置了 `subagentStatusLine`, 应同样展示为状态栏相关能力, 并明确它作用于 subagent row。
- 如果当前 agent 不支持或尚未接入状态栏, UI 应说明“不支持/未接入”, 而不是给一个永远为空的入口。

## 实际结果

- 只有 `~/.claude/statusline*` 这种文件名匹配时才会展示。
- 真实配置只写在 `settings.json` 的常见用法不会展示。
- 状态栏 tab 对多数用户表现为无数据, 像是废功能。

## 解决方案

- 已在 Claude Code `settings.json` / project settings 解析中增加 `statusLine` 与 `subagentStatusLine`。
- 已保留脚本引用解析, 资产来源以配置文件为准, 脚本路径作为 `entryPaths`。
- 已按 Codex 官方配置接入 `[tui].status_line`, 并区分未设置、显式空数组隐藏、未知 item。
- 已补单元测试和 renderer 测试覆盖 user/project `statusLine`、`subagentStatusLine`、inline command、script path、Codex footer items、空态和隐藏状态。

## 归档

- 任务归档路径: `docs/works/_archive/2026-05-30-gh-7-status-line-capability-compatibility/`
