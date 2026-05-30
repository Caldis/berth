# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准。

## 数据契约

### S1. 单 hook 启停契约

新增 IPC:

- `hooks:set-hook-enabled(request): SetHookEnabledResult`

请求字段:

- `agentId`: 只接受 `codex`。Claude Code 单 hook 启停不进入主进程写入路径。
- `scope`: 当前只接受 `user`。项目级写入后续第 5 项单独处理。
- `hookKey`: Codex 官方 hook key, 由 `<sourcePath>:<snake_case_event>:<groupIndex>:<handlerIndex>` 组成。
- `sourcePath`: 原始 hook 定义所在文件, 仅用于校验与错误信息。
- `enabled`: 目标状态。

返回字段:

- `hookKey`
- `enabled`
- `changed`
- `sourcePath`: 实际写入的 `~/.codex/config.toml`

主进程写入规则:

- 只写 `~/.codex/config.toml`。
- 只更新 `hooks.state.<hookKey>.enabled`。
- 写入前备份现有文件为 `.bak`。
- 拒绝 managed hook、缺失 key、非 Codex、非 user scope。

扫描层:

- `parseCodexConfig` 读取 `hooks.state`。
- `parseCodexHooksJson` 可接收同目录 `config.toml` 的状态。
- `parseCodexHooks` 跳过 `state`、`managed_dir`、`windows_managed_dir` 等非事件键。
- 每个 Codex hook asset 写入 `meta.hookKey`, `meta.enabled`, `meta.canToggleHook`, `meta.stateSourcePath`。

### S2. 入口文件识别契约

在 Claude 与 Codex parser 中统一增强 command path 提取:

- 支持 `~`。
- 支持 `${CLAUDE_PROJECT_DIR}`、`${CLAUDE_PLUGIN_ROOT}`、`${CLAUDE_PLUGIN_DATA}`。
- 支持 `$CODEX_HOME`、`${CODEX_HOME}`。
- 对 Codex 推荐的 `$(git rev-parse --show-toplevel)/.codex/hooks/foo.py` 识别为项目根路径。
- 只把存在的脚本文件写入 `meta.entryPaths`。

### S3. 生命周期对照契约

在 hooks 页面增加一个只读对照视图状态:

- `lifecycle`: 默认当前页面。
- `comparison`: 以阶段为行, Claude Code / Codex 为列, 显示原生事件、支持状态和差异说明。

视角规则不变:

- `all`: 显示双 Agent 对照。
- `claude`: 只显示 Claude Code 列。
- `codex`: 只显示 Codex 列。

### S4. 配置风险提示契约

在 hook row 上基于现有 meta 给出轻量风险标签:

- 命令入口文件缺失。
- Codex `async: true` 或非 `command` handler 当前不会运行。
- Codex `UserPromptSubmit` / `Stop` matcher 会被忽略。
- Claude Code 全局 `disableAllHooks` 导致该 hook 不运行。

该项只提示, 不自动修改配置。

### S5. 用户级 / 项目级开关契约

Agent 级开关从单一 user 状态扩展为 scope 列表:

- Claude Code: user settings 与项目 settings 分别显示; managed 只读。
- Codex: user `~/.codex/config.toml` 与项目 `.codex/config.toml` 分别显示。
- 本阶段只实现页面区分与 user 写入。项目写入若当前项目路径不可确定, 按不可用展示。

### S6. 密度优化契约

页面增加本地 UI 状态:

- `comfortable`: 当前样式。
- `compact`: 缩小阶段说明区, hook row 使用更紧凑布局, 长命令保留可读截断。

密度状态只存在于组件内, 不写配置。

### S7. Hook 健康检查入口契约

hooks 页面复用现有 `assets:health-check`:

- 在顶部显示 hook 相关检查数量。
- 支持快速跳到当前 hooks tab 可处理的检查。
- 不新增修复写入。

## 模块结构 / 组件拆分

- `src/shared/types/ipc.ts`: 增加单 hook 启停 IPC 类型。
- `src/preload/index.ts` / `src/preload/index.d.ts`: 暴露新 IPC。
- `src/main/engine/hooks-manager.ts`: 增加 Codex `hooks.state` 读写与校验。
- `src/main/adapters/codex/parsers.ts`: 生成 hook key, 合并 `hooks.state`, 跳过非事件键。
- `src/main/adapters/codex/index.ts`: 解析 `hooks.json` 时传入 user config state。
- `src/main/adapters/claude-code/parsers.ts`: 入口文件识别增强。
- `src/main/ipc/handlers.ts`: 注册新 IPC, 写入后重新扫描并刷新 search index。
- `src/renderer/src/lib/hook-lifecycle.ts`: 补充 row 管理状态、风险状态、对照数据。
- `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`: 拆出 `HookRowToggle`, `HookRiskHints`, `HookComparisonTable`, `HookDensityToggle`。
- `src/renderer/src/i18n/locales/{en,zh}.json`: 补充面向非专家的说明文案。

## 测试策略

- Parser 单测: Codex `hooks.state` 合并、非事件键跳过、hook key 生成、入口路径识别。
- Manager 单测: Codex 单 hook 启停写入 TOML, 拒绝 Claude / managed / 缺失 key。
- 生命周期单测: row 状态、不可用原因、风险标签。
- Renderer 单测: Codex row toggle 成功/失败, Claude row 不显示启停按钮, 对照模式按视角隐藏列。
- 验证命令: 先跑相关 Vitest 文件, 再跑 `pnpm typecheck` 与 `pnpm harness:check`。

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| S1 | 1, 2, 3, 4, 5, 6, 7 |
| S2 | 7 |
| S3 | 1, 2, 7 |
| S4 | 2, 6, 7 |
| S5 | 1, 2, 6, 7 |
| S6 | 7 |
| S7 | 7 |
