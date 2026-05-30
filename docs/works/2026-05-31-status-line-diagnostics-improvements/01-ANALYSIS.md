# Explore 记录

## 官方资料

- Claude Code status line 官方文档: https://code.claude.com/docs/en/statusline
  - `statusLine` 是 settings 中的 command 配置。
  - 命令从 stdin 接收 JSON session data，stdout 作为状态栏输出。
  - `padding`、`refreshInterval`、`hideVimModeIndicator` 是官方字段。
  - 脚本需要可执行；Windows 可用 PowerShell / Git Bash 示例。
- Claude Code settings 官方文档: https://code.claude.com/docs/en/settings
  - user / project / local / managed settings 会形成配置层级。
- Codex slash commands 官方文档: https://developers.openai.com/codex/cli/slash-commands#configure-footer-items-with-statusline
  - `/statusline` 选择并重排 footer items。
  - 结果立即生效，并持久化到 `config.toml` 的 `tui.status_line`。
  - Codex 是内置 footer item 列表，不运行自定义状态栏脚本。

## 当前实现观察

- Claude Code settings 状态栏解析已存在，资产包含 `settingKey`、`statusLineKind`、`command`、`entryPaths`、`disabledByDisableAllHooks`。
- Codex `tui.status_line` 解析已存在，资产包含 `items`、`knownItems`、`unknownItems`、`hidden`。
- 页面当前主要展示每条 asset，不计算“当前最终生效项”。
- 页面直接展示 command 原文，缺少敏感片段处理。
- 健康检查目前只靠 disabled / unknown item 的局部提示，没有统一状态。

## 验收标准

1. 页面能按 provider + status line kind 分组，标出同组最终生效项和被覆盖项。
2. Codex 未配置时显示默认 footer items；显式空数组显示为隐藏。
3. Claude Code command 默认展示脱敏版本，能提示存在敏感片段。
4. 页面能展示配置健康状态: ok / warning / blocked。
5. 已有状态栏 unit / renderer 测试覆盖新增行为。
6. `pnpm test -- tests/renderer/status-line-section.test.tsx tests/unit/codex-config-parser.test.ts` 通过。
7. `pnpm typecheck` 与 `pnpm harness:check` 通过，或明确说明被其他任务阻塞。
