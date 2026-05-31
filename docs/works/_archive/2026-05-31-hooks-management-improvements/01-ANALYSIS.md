# 需求分析 (Explore 产物)

## 现状理解

Hooks 页面现在由渲染层的 `HooksLifecycleView` 展示, 生命周期抽象在 `src/renderer/src/lib/hook-lifecycle.ts`。扫描数据来自主进程:

- Claude Code hooks: `src/main/adapters/claude-code/parsers.ts` 从 `settings.json` 读取 `hooks`。
- Codex hooks: `src/main/adapters/codex/parsers.ts` 从 `config.toml` 内联 `[hooks]` 和 `hooks.json` 读取。
- Agent 级启停: `src/main/engine/hooks-manager.ts` 已能写 Claude Code `disableAllHooks` 与 Codex `[features].hooks`。
- IPC: `hooks:status` / `hooks:set-enabled` 已通过 preload 暴露到渲染层。

页面目前已经能:

- 按 `all` / `claude` / `codex` 视角过滤解释文案。
- 展示抽象后的生命周期阶段。
- 打开 hook 来源文件、来源目录、入口文件、入口目录。
- 展示 Agent 级 hooks 总开关。

## 官方能力边界

Claude Code 官方 hooks 文档说明:

- hook 是生命周期点上的命令、HTTP、MCP tool、prompt 或 agent handler。
- `/hooks` 菜单是只读浏览器。
- 临时禁用只能通过 `"disableAllHooks": true` 关闭全部 hooks。
- 官方明确说没有办法在保留配置的同时禁用单个 hook。

Codex 官方文档说明:

- hooks 默认启用, 可通过 `[features].hooks = false` 关闭全局 hooks。
- hooks 可来自 `hooks.json` 或 `config.toml` 内联 `[hooks]`。
- 非托管 command hook 需要被 review/trust 后才运行。
- `/hooks` 可检查、信任、禁用单个非托管 hook。
- 托管 hooks 不可由用户 hook browser 禁用。
- app-server README 说明单 hook 状态不写回 hook 定义, 而是写入用户配置的 `hooks.state`, key 形如 `<sourcePath>:<event>:<groupIndex>:<handlerIndex>`, value 形如 `{ enabled = false }`。

因此第 1 项不能用同一写法覆盖两个 Agent:

- Claude Code: 单 hook 启停必须保持不可用, 页面解释原因。
- Codex: 可对非托管 hook 写 `hooks.state`。不直接修改 hook handler, 也不向 hook 定义对象写非官方 `disabled` 字段。

## 关联与依赖

- 扫描层需要读 Codex `config.toml` 的 `hooks.state`, 并把状态合并到来自 `config.toml` 与 `hooks.json` 的 hook asset 上。
- Codex hook asset 需要稳定暴露 hook key, enabled 状态, managed 状态, handler 位置, 来源文件。
- 主进程需要新增单 hook 启停 IPC。写入边界只允许 Codex 用户级 `~/.codex/config.toml` 的 `hooks.state`。
- 渲染层需要把 row 级 toggle 接到 IPC, 并在成功后重新扫描或更新页面状态。
- Claude Code row 级 toggle 只能展示不可用原因, 不能写 settings。
- 入口文件识别增强要覆盖 `~`, 环境变量、`${CLAUDE_PROJECT_DIR}` / `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_DATA}` 以及 Codex 推荐的 `$(git rev-parse --show-toplevel)` 场景。这个属于第 2 项。

## 验收标准

1. 在 Claude 视角下, 单个 hook 行不出现可点击的启停按钮; 页面清楚说明 Claude Code 官方不支持单 hook 禁用。
2. 在 Codex 视角下, 非托管 hook 行能显示当前 enabled/disabled/trust 相关状态; 托管 hook 行不能启停。
3. 对 Codex 非托管 hook 执行启停时, 主进程只更新用户级 `~/.codex/config.toml` 的 `hooks.state`, 不修改 `hooks.json` 或内联 hook 定义本身。
4. Codex hook key 由来源文件路径、事件名、matcher 组索引、handler 索引组成; 重新扫描后同一 hook 能读回启停状态。
5. `hooks.state` 不应被误解析成一个 hook event。
6. 行级启停失败时, UI 展示错误, 不把本地状态错误地改成成功。
7. 每个可独立增量有对应单元测试或渲染测试; 至少覆盖 parser、hooks manager、生命周期状态和页面交互。

## 未决问题

无需要阻塞设计的问题。第 1 项按官方 `hooks.state` 语义实现 Codex, Claude 保持不可用说明。

## 外部依据

- Claude Code hooks reference: https://code.claude.com/docs/en/hooks
- Codex hooks guide: https://developers.openai.com/codex/hooks
- Codex config reference: https://developers.openai.com/codex/config-reference
- Codex app-server README hooks/list and hooks.state: https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md
