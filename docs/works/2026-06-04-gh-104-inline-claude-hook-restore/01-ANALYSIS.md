# 需求分析 (Explore 产物)

## 现状理解

本任务涉及四段链路:

1. 外部工具语义:
   - Claude Code 官方 Hooks 文档说明: 可以用 `disableAllHooks` 临时禁用全部 Hooks; 要移除单个 Hook 需从 settings JSON 删除; 没有“保留配置但禁用单个 Hook”的官方字段。来源: https://code.claude.com/docs/en/hooks
   - Codex 官方 Hooks 文档说明: `/hooks` 可检查 Hook 来源、信任 Hook, 也可禁用 individual non-managed hooks; managed hooks 不能从用户 Hook browser 禁用。来源: https://developers.openai.com/codex/hooks
2. 主进程扫描:
   - `docs/ARCHITECTURE.md` 定义 renderer 不能直接访问 Node, Hook 文件读写必须走 `src/main/` 和 preload IPC。
   - `src/main/adapters/claude-code/scanner.ts` 扫 `~/.claude/settings.json`; user scope 会把 sidecar `~/.claude/.berth/hooks-state.json` 传给 `parseHooks()`。
   - `src/main/adapters/claude-code/parsers.ts` 已经把 sidecar 中的禁用 Hook 合成回 hook asset: `enabled: false`, `effectiveEnabled: false`, `canToggleHook: true`, `toggleStrategy: soft-remove`, `disabledByBerth: true`。这说明“右侧原地恢复”已有数据基础。
   - 当前只有 settings 文件存在时才调用 `parseHooks()`。如果 `settings.json` 缺失但 sidecar 存在, 禁用 Hook 行不会出现在右侧列表; 旧恢复中心会显示 `source-missing`。删除恢复中心前需要补这个缺口。
3. 主进程写入:
   - `src/main/engine/hooks-manager.ts` 的 `setHookEnabled()` 已统一处理 Claude Code 与 Codex 单 Hook 启停。
   - Codex 写 `~/.codex/config.toml` 的 `hooks.state[hookKey].enabled`。
   - Claude Code 禁用时从 `settings.json` 移除 Hook 并写 sidecar; 恢复时从 sidecar 插回 `settings.json` 并删除 sidecar entry。
   - `restoreClaudeHook()` 对缺失 `settings.json` 的情况可以用空对象恢复并创建文件; 因此“原地恢复”不必继续把 source-missing 作为不可恢复状态处理。
4. 渲染层:
   - `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx` 当前左侧 rail 在 Hook 检查下方渲染 `<HookRecoveryCenter />`。
   - `HookRecoveryCenter` 会额外调用 `window.api.hooks.recoveries()`, 展示集中列表, 并支持集中恢复、清理、打开来源。
   - 右侧 `HookAssetRow` 已根据 `meta.enabled` 显示“Enabled / Disabled”状态 tag, 并通过 `window.api.hooks.setHookEnabled()` 原地切换。Claude `soft-remove` 和 Codex `native-state` 共用这套按钮。
   - sidecar 解析错误已由 scanner 写入 scan errors, `health.ts` 会转为 health check, 所以删除恢复中心后仍有错误入口。

## 关联与依赖

- IPC/preload:
  - 当前恢复中心专用契约是 `hooks:recoveries` 与 `hooks:clear-recovery`, 类型在 `src/shared/types/ipc.ts`, preload 暴露在 `window.api.hooks.recoveries()` / `clearRecovery()`。
  - 删除用户可见恢复中心后, 这些 API 若无其他调用, 应一并移除或退为内部私有函数, 避免继续暴露“恢复中心模式”。
- 测试:
  - `tests/unit/claude-scanner.test.ts` 已覆盖 sidecar disabled Hook 被读成 disabled asset。
  - `tests/unit/hooks-manager.test.ts` 已覆盖 Codex `hooks.state` 写入、Claude sidecar 禁用/恢复、清理恢复点。
  - `tests/renderer/hooks-lifecycle-view.test.tsx` 已覆盖 Claude/Codex 行内启停, 同时也有恢复中心相关测试; 本任务需要删除恢复中心测试, 增加“不渲染恢复中心”和“sidecar disabled Hook 原地恢复”回归。
  - `tests/setup.ts` 当前 mock 仍包含 `recoveries` 和 `clearRecovery`; 若删除 preload API, 测试 setup 也要同步。
- 文案:
  - i18n 中 `capabilities.hooks.recovery.*` 只服务恢复中心; 删除组件后应清理无用文案。
  - 行内 Claude 恢复文案已有 `confirmRestoreClaudeHook` / `confirmSoftDisableClaudeHook`, 仍可保留并做措辞校准。
- 用户手册与 Settings capability plugin 文案仍会提到 `~/.claude/.berth/hooks-state.json`。这不是恢复中心 UI, 可以继续作为实现说明, 但文案不应暗示用户要去集中恢复。

## 任务分类与 debt 校准
- type / maintenance.subtype: feature
- source.kind / refs: user-request / GH-104
- debt estimate 修正: 不变
- scope / risk / areas / confidence: module / medium / ui-ux, architecture / medium
- revision: 无

## 验收标准
1. Hooks 生命周期页不再显示「恢复中心」或集中恢复点列表, 也不再为该组件发起 `hooks:recoveries` IPC。
2. Claude Code sidecar 中被 Berth 软禁用的 user Hook 仍出现在右侧对应生命周期分组里, 状态显示为禁用, 行内按钮显示“启用/Enable”。
3. 在该行点击启用时, 继续调用 `hooks:set-hook-enabled` / `setHookEnabled({ agentId: 'claude-code', enabled: true })`, 从 sidecar 恢复到 `settings.json`, 并刷新资产。
4. Codex `native-state` 行内启停体验不退化, 仍通过 `hooks.state` 展示禁用状态和启用按钮。
5. 如果 `settings.json` 缺失但 sidecar 还在, Berth 仍能从 sidecar 显示禁用 Hook 行, 用户可以在原行恢复。
6. sidecar 解析错误不再依赖恢复中心展示; Hook 检查或 scan error 路径仍能给出可读错误。
7. 删除未使用的恢复中心 IPC/preload/type/i18n/测试 mock, 或有明确理由保留内部函数但不暴露到 renderer。
8. 目标 unit、renderer、typecheck 与当前任务 harness check 通过。

## 界面质量与交互验收

当前 Hooks 页是密集工具型页面: 左侧为 lifecycle rail、Hook 检查; 右侧为分阶段 Hook 列表。新方案应减少左侧工具区噪声, 不新增卡片或说明区。用户路径为“看到某个 Hook -> 禁用 -> 同一行状态变为禁用 -> 同一行恢复”。可见状态需要覆盖 enabled / disabled / busy / disabled button / row error / managed read-only。响应式上, 行内按钮已经使用 flex wrap, 删除恢复中心应让窄屏少一个折叠面板。可访问性上, 行内按钮仍保留 button 语义和确认弹窗; 不再需要恢复中心 loading skeleton 的 aria label。

## 未决问题

无。用户已明确要求保留 sidecar, 废除集中恢复中心模式。
