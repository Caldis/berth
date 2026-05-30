# 需求分析 (Explore 产物)

## 现状理解

当前 `Capabilities` 页面已经有 `Status Line` tab, 但数据来源没有跟真实配置对齐:

- `src/renderer/src/pages/capabilities.tsx` 中 `statusLine` tab 只展示 `type === 'statusline'` 的 asset。
- `src/shared/types/asset.ts` 已定义 `statusline` 类型。
- Claude Code scanner 只扫 `~/.claude/statusline*` 文件, 再用 `parseStatusline()` 包成 asset。
- Claude Code `settings.json` 中的 `statusLine` / `subagentStatusLine` 没有解析。
- Codex `config.toml` 中的 `[tui].status_line` 没有解析。
- 当前 `StatusLineSection` 只显示文件名和路径, 对用户解释力很弱。

## 官方资料

Claude Code:

- 官方状态栏入口是 `/statusline` 或手动在 `settings.json` / project settings 增加 `statusLine`。
- `statusLine` 是 command-backed: `type = command`, `command` 可指向脚本路径, 也可为 inline command。
- 可选字段包括 `padding`, `refreshInterval`, `hideVimModeIndicator`。
- 状态栏命令通过 stdin 接收 JSON, 输出 stdout; 数据包含 model、workspace、cost、context_window、rate_limits、session、version、vim、agent、pr、worktree 等。
- `subagentStatusLine` 是另一个设置, 作用于 agent panel 中每个 subagent row, stdin 是包含 `tasks` 数组的 JSON, stdout 每行一个 JSON 覆盖 row。
- `disableAllHooks=true` 会同时禁用 status line; status line 执行 shell command, 需要 workspace trust。
- 插件可在自己的 `settings.json` 提供默认 `subagentStatusLine`。本轮只扫描当前 adapter 已知来源, 不新增插件配置归并能力。

Codex:

- 官方 `/statusline` 用 picker 选择并排序 TUI footer items, 立即更新并持久化到 `config.toml` 的 `tui.status_line`。
- openai/codex primary source 中 `Tui` 配置定义为 `status_line: Option<Vec<String>>` 和 `status_line_use_colors: bool`。
- `status_line` unset 时默认显示 `model-with-reasoning` 与 `current-dir`; unset 不等于用户显式配置资产。
- 可选 item ID 来自 `StatusLineItem`, 包括 `model`, `model-with-reasoning`, `current-dir`, `project-name`, `git-branch`, `pull-request-number`, `branch-changes`, `run-state`, `permissions`, `approval-mode`, `context-remaining`, `context-used`, `five-hour-limit`, `weekly-limit`, `codex-version`, `context-window-size`, `used-tokens`, `total-input-tokens`, `total-output-tokens`, `thread-id`, `fast-mode`, `raw-output`, `thread-title`, `task-progress`。
- Codex 当前是 fixed footer items, 不是 command-backed script。GitHub issues 中仍有用户请求 Claude Code 式 command-backed status line, 说明不能把两者当成同一能力。

来源:

- https://code.claude.com/docs/en/statusline
- https://code.claude.com/docs/en/settings
- https://developers.openai.com/codex/cli/slash-commands#configure-footer-items-with-statusline
- https://github.com/openai/codex/blob/main/codex-rs/config/src/types.rs
- https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/status_line_setup.rs

## 关联与依赖

涉及模块:

- Claude scanner/parser: `src/main/adapters/claude-code/scanner.ts`, `src/main/adapters/claude-code/parsers.ts`
- Codex parser: `src/main/adapters/codex/parsers.ts`
- Renderer status line UI: `src/renderer/src/pages/capabilities.tsx`
- i18n: `src/renderer/src/i18n/locales/en.json`, `src/renderer/src/i18n/locales/zh.json`
- 测试: `tests/unit/claude-scanner.test.ts`, `tests/unit/codex-config-parser.test.ts`, 可新增 renderer status line 测试。

本轮不做:

- 不执行用户的 status line command。
- 不判断脚本内容是否正确, 只展示配置和引用路径是否存在。
- 不合并 Claude managed / plugin 默认配置来源, 因为当前 adapter 尚无完整 source provider 层。
- 不给 Codex 增加 command-backed status line 这种官方未支持能力。

## 验收标准

1. Claude Code `settings.json` / project settings 中的 `statusLine` 能被扫描成状态栏能力资产。
2. Claude Code `subagentStatusLine` 能被扫描成状态栏能力资产, 并和普通 status line 区分。
3. Codex `config.toml` 中真实持久化的状态栏配置能被扫描成状态栏能力资产。
4. 状态栏页面能按 agent 展示不同语义: Claude command-backed script, Codex TUI footer fields。
5. UI 对未接入、无配置、配置缺失路径等状态给出可理解的说明, 不让用户误以为空白 tab 是应用坏了。
6. 单元测试覆盖 Claude user/project、Codex user/project、无配置、inline command、script path、字段列表。
7. 变更只触碰本任务相关文件, 不提交当前工作区其他 agent 的改动。

## 未决问题

无 PRD 级阻塞。实现时如发现 Codex `status_line` 支持对象项而非字符串项, 只能展示为 unknown item, 不应按 command-backed 解释。
