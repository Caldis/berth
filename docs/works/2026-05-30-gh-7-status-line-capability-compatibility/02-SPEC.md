# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

继续使用共享 `Asset.type = 'statusline'`, 但通过 `meta.provider` 区分语义。

Claude Code:

```ts
meta: {
  provider: 'claude-code'
  settingKey: 'statusLine' | 'subagentStatusLine'
  statusLineKind: 'main' | 'subagent'
  commandType: string
  command?: string
  padding?: number
  refreshInterval?: number
  hideVimModeIndicator?: boolean
  disabledByDisableAllHooks: boolean
  entryPaths: string[]
  source: string
}
```

说明:

- `path` 始终指向承载配置的 settings 文件。
- `entryPaths` 只记录能从 command 中保守识别且本机存在的脚本路径。
- `disabledByDisableAllHooks` 来自同一个 settings 文件的 `disableAllHooks === true`; 不跨来源做最终合并判断。
- `name` 使用 `Status Line` / `Subagent Status Line`, 加 scope 由 UI badge 展示。

Codex:

```ts
meta: {
  provider: 'codex'
  settingKey: 'tui.status_line'
  statusLineKind: 'footer-items'
  items: string[]
  knownItems: string[]
  unknownItems: string[]
  useThemeColors?: boolean
  source: string
}
```

说明:

- 只在 `config.toml` 显式存在 `[tui].status_line` 且是字符串数组时产出 asset。
- `[tui].status_line` 未设置时不产出 asset, UI 用空态说明 Codex 默认 footer 是 `model-with-reasoning` + `current-dir`。
- 未识别 item 不丢弃, 放入 `unknownItems`, UI 标记为 unknown。

## 模块结构 / 组件拆分

后端:

- `src/main/adapters/claude-code/parsers.ts`
  - 新增 `parseStatuslinesFromSettings(filePath, scope): Asset[]`
  - 保留 `parseStatusline(filePath, scope)` 作为旧文件扫描兼容, 但 meta 标记 `legacyFile: true`
- `src/main/adapters/claude-code/scanner.ts`
  - 在 settings source 循环里追加状态栏解析。
  - 增加 project `.claude/settings.local.json` 的 status line 扫描, 只用于本功能。
- `src/main/adapters/codex/parsers.ts`
  - `parseCodexConfig()` 追加 `parseCodexStatusLine(filePath, scope, config)`。

前端:

- 第一轮保持 `StatusLineSection` 在 `capabilities.tsx` 内部, 避免和 hooks 页面并行重构冲突。
- UI 分三块:
  - 顶部说明: 状态栏是什么, Claude Code 和 Codex 差异。
  - Summary: 总数、Claude command 数、Codex footer items 数、disabled 数。
  - Cards: 按 asset 展示 provider、scope、source、command/items、脚本路径、禁用提示、查看原始配置。
- 无数据时仍展示说明和按当前 agent view 的解释:
  - Claude: 检查 `settings.json` / project `.claude/settings.json` / `.claude/settings.local.json`。
  - Codex: 未配置时使用默认 footer items。

## 测试策略

Unit:

- `tests/unit/claude-scanner.test.ts`
  - `parseStatuslinesFromSettings()` 解析 `statusLine` 与 `subagentStatusLine`。
  - `disableAllHooks` 标记 disabled。
  - command 中引用存在脚本时填入 `entryPaths`。
  - `scanCapabilities()` 扫到 project `.claude/settings.local.json` 的 status line。
- `tests/unit/codex-config-parser.test.ts`
  - `[tui] status_line = [...]` 产出 `statusline` asset。
  - 未设置 `status_line` 不产出 asset。
  - unknown item 保留到 `unknownItems`。

Renderer:

- 新增 `tests/renderer/status-line-section.test.tsx` 或通过 `Capabilities` 页面测试:
  - Claude asset 显示 command、disabled warning、script path。
  - Codex asset 显示 ordered footer items 与 unknown item。
  - 空态仍解释默认/配置位置。

门禁:

- `pnpm test -- tests/unit/claude-scanner.test.ts tests/unit/codex-config-parser.test.ts tests/renderer/status-line-section.test.tsx`
- `pnpm typecheck`
- `pnpm harness:check`; 若失败来自其他 agent 的未完成 work, 记录阻塞, 不提交沉淀产物。

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| Claude settings status line parser | 1, 2, 6 |
| Codex `[tui].status_line` parser | 3, 6 |
| Status Line 页面分 provider 展示 | 4, 5 |
| 空态与禁用提示 | 5 |
| scoped tests/typecheck/harness | 6, 7 |
