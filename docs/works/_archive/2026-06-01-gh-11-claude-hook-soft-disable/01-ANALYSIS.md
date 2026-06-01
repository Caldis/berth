# 需求分析 (Explore 产物)

## 现状理解

当前 Hooks 单项启停链路:

- renderer: `src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`
  - `HookAssetRow` 根据 `getHookManagementState()` 取 `toggle-hook` 状态。
  - 当前 `toggleHook()` 里有 `hook.agentId !== 'codex'` 的硬判断, Claude Code 不会发起单 Hook 启停请求。
- renderer lib: `src/renderer/src/lib/hook-lifecycle.ts`
  - `getToggleHookState()` 对 Claude Code 固定返回 unavailable, 文案是 `capabilities.hooks.management.claudeNoSingleHookToggle`。
  - Codex 只有 `meta.canToggleHook === true` 且有 `meta.hookKey` 才可切换。
- preload / shared IPC:
  - `src/shared/types/ipc.ts` 的 `SetHookEnabledRequest.scope` 当前只允许 `user`。
  - `window.api.hooks.setHookEnabled()` 已存在, 不需要为 UI 新增入口, 但需要扩展请求语义支持 `agentId: 'claude-code'`。
- main:
  - `src/main/engine/hooks-manager.ts#setHookEnabled()` 当前只支持 Codex, 写入 `~/.codex/config.toml` 的 `[hooks.state.<hookKey>].enabled`。
  - Claude Code 只支持 agent 级 `disableAllHooks`, 写 `~/.claude/settings.json`。
- scanner / parser:
  - `src/main/adapters/claude-code/parsers.ts#parseHooks()` 只从 `settings.hooks[event][handlerIndex].hooks[hookIndex]` 解析 active hook。
  - Claude hook asset 目前没有 `hookKey`、`enabled`、`canToggleHook` 或恢复所需的定义 hash。
  - `src/main/adapters/claude-code/scanner.ts#scanCapabilities()` 扫 `~/.claude/settings.json`、managed settings、project `.claude/settings.json`、project `.claude/settings.local.json`。

代码边界:

- 文件系统写入只能放在 main process。renderer 仍只通过 preload IPC 调用。
- 现有架构文档仍写着 v0.1 只读, 但当前仓库已经有 hooks-manager 写 `disableAllHooks` 和 Codex `hooks.state`; 本任务应继续沿主进程受控写入路径, 不让 renderer 直接访问 Node。
- 当前实现只对 user scope 写入, project / enterprise 保持只读是已有行为。

## 外部资料结论

Claude Code 官方 Hooks reference:

- Hooks 是定义在 JSON settings 文件里的配置。常见位置包括 `~/.claude/settings.json`、项目 `.claude/settings.json`、项目 `.claude/settings.local.json`。
- `/hooks` 菜单是只读浏览器; 添加、修改、移除 hook 需要编辑 settings JSON。
- 官方明确说没有“保留配置但禁用单个 hook”的机制; 若要移除单个 hook, 删除 settings JSON 中的 entry; 若要临时禁用全部 hooks, 写 `"disableAllHooks": true`。
- 官方还说明直接编辑 settings 文件通常会被文件 watcher 自动识别。

来源: https://code.claude.com/docs/en/hooks

Codex 官方 Hooks reference:

- Codex hooks 默认开启, 可以用 `[features].hooks = false` 关闭全部 hooks。
- Codex 支持 `hooks.json` 和 inline `[hooks]` 两种来源, 多来源会合并。
- Codex `/hooks` 支持 review / trust / disable 单个 non-managed hook; managed hooks 不能从用户 hook browser 禁用。

来源: https://developers.openai.com/codex/hooks

社区和 issue:

- 社区里已有本地 dashboard 类工具直接管理 Claude Code settings 文件, 该类工具会在每次写真实配置前创建时间戳备份, 并用“写临时文件再 rename”的方式避免半写文件。来源: https://www.reddit.com/r/ClaudeCode/comments/1s8sizr/claude_code_dashboard_to_manage_all_settings/
- Claude Code 对 `~/.claude/settings.json` 这类自有配置文件编辑有额外确认语义; 即使在 bypass permission 场景, 用户仍可能被提示确认。这个 issue 说明 settings 编辑被视为敏感操作。来源: https://github.com/anthropics/claude-code/issues/37029
- 社区安全讨论已经出现恶意包把 `SessionStart` hook 写入 `.claude/settings.json` 形成持久化的案例。这个事实说明 Berth 的单 Hook 禁用不能只是“方便开关”, 还应把“这会修改 Claude 配置并保存恢复点”讲清楚。来源: https://www.reddit.com/r/Python/comments/1t0u8jj/pytorch_lightning_malware_plants_a_hook_in_claude/
- Claude Code hooks 在不同版本和事件上存在社区报告的执行差异。Berth 的职责不应承诺验证 hook 实际执行, 只应保证本地配置结构被正确移除/恢复。来源: https://github.com/anthropics/claude-code/issues/6305

## 方案取舍

不可采用:

1. 在 hook object 上加 `enabled: false`
   - Claude Code 官方没有该字段。它可能被忽略, 结果是 UI 显示禁用但 hook 仍运行。
2. 把 event key 或 handler key 重命名为 `_disabled_*`
   - 这会把未知结构留在 Claude settings 里。未来 Claude 新增同名事件或加强 schema 校验时可能出问题。
   - 如果未知 event 被解析为普通 hook event, 还可能造成噪音或错误。
3. 改写 command 为 no-op
   - 会破坏用户原始命令文本, 恢复困难, 也可能影响审计和安全判断。
4. 只做整文件 `.bak`
   - 能回滚文件, 但无法在 UI 中展示“已禁用的单个 hook”, 也无法只恢复一个 hook。

推荐方案:

- 对 Claude Code 的“单 Hook 禁用”定义为 Berth soft disable:
  - disable: 从 active `settings.hooks` 中删除对应 hook JSON 节点。
  - state: 把被删除节点、原事件、matcher group、原始位置、定义 hash、禁用时间、来源文件写入 Berth sidecar 文件。
  - restore: 从 sidecar 读取恢复点, 把 hook 插回 Claude settings。
  - backup: 每次写 settings 前创建时间戳整文件备份。
  - write: 用同目录临时文件 + rename 写入, 避免半写 JSON。
- UI 文案不说“Claude Code 原生禁用”, 而说“从 Claude Code 配置中暂时移除, Berth 保存恢复点”。这和官方事实一致。
- 初版只支持 `scope: user` 的 `~/.claude/settings.json`。project / local / enterprise hooks 继续显示不可用原因:
  - project 文件可能被 Git 跟踪, 写入会污染仓库, 需要单独设计确认与 diff。
  - enterprise / managed 不应由用户态工具修改。

## 关联与依赖

- `parseHooks()` 需要能同时输出 active hooks 和 Berth sidecar 中的 disabled hooks, 否则禁用后页面会完全消失, 用户无法恢复。
- `getHookManagementState()` 需要改成:
  - Claude Code user-scope + `meta.canToggleHook === true` -> `needs-confirmation`
  - Claude Code 非 user / managed / 缺少 key -> unavailable
  - Codex 逻辑保持现状
- `hooks-manager.ts#setHookEnabled()` 需要分支:
  - Codex: 保持写 `[hooks.state]`
  - Claude Code: 执行 JSON 节点移除/恢复和 sidecar 更新
- 需要新增或扩展测试:
  - Claude parser 输出 `hookKey` / `enabled` / `canToggleHook`
  - manager 能禁用并恢复 nested hook
  - manager 对 stale key / source mismatch / managed / 非 user 拒绝
  - lifecycle lib 让 Claude user hook 可切换
  - renderer 点击 Claude hook disable / enable 会调用 IPC

## 验收标准

1. Claude Code user-scope hook 在 UI 上不再提示“没有保留注册但单独禁用机制”, 而是提供可确认的禁用操作。
2. 禁用 Claude Code 单 hook 后, 对应 JSON 节点从 `~/.claude/settings.json` 的 active `hooks` 配置里移除。
3. 禁用时 Berth 保存可恢复的 sidecar 记录, 包含来源文件、event、scenarioHash、hookHash、matcher group 信息、hook JSON、removedCount、disabledAt。
4. 禁用后页面仍能展示这条 hook 为 disabled, 并提供恢复操作。
5. 恢复后 hook 回到 Claude settings 的目标 scenario; 若 active 配置里已经存在同一 scenario + hookHash, 恢复应视为 no-op 并清理 sidecar 记录。
6. 对 source 文件变化导致无法定位的禁用/恢复, 不静默改写; 返回可理解错误, 要求刷新后重试。
7. 每次写 settings 前创建时间戳备份; 写入使用临时文件 + rename, 不留下半写 JSON。
8. Codex 单 hook 切换行为保持不变。
9. project / local / enterprise Claude hook 初版仍不可单项切换, UI 给出明确原因。
10. 所有写入逻辑只在 main process, renderer 不直接读写文件。

## 界面质量与交互验收

- 现有 Hooks 页面是生命周期侧栏 + 阶段卡片 + 行级 Actions。
- 单 Hook 启停是行级高频操作, 不应放进详情大段说明里。
- 操作按钮继续使用当前 `Disable hook` / `Enable hook` 样式, 但 Claude Code 首次支持时确认文案必须说明:
  - 修改的目标文件路径。
  - 这不是 Claude Code 原生 state, 而是 Berth soft disable。
  - Berth 会保存恢复点和整文件备份。
- disabled 行继续使用现有绿色/灰色状态 tag 体系, 避免新增大块警告。
- error 状态显示在当前行下方, 不弹全局 toast。
- 键盘用户应能 focus 按钮并触发确认; 按钮 busy 时禁用。
- 小屏不新增额外列, 状态 tag 和按钮保持可换行。

## 未决问题

无需要用户先澄清的问题。初版按 user-scope Claude Code hook 设计, project/local scope 写入留到后续任务。
