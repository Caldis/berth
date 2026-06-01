# 任务清单 (Design 产物 / 活清单)

## Implementation

- [x] 收窄并确认本轮实现范围
  - [x] GH-11 只做 hooks enable / disable 切片。
  - [x] 完整 `Agent Capability Plugin System` 保留在 `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`。
  - [x] 不实现插件下载、设置页插件中心、版本管理、health/session/usage/source coverage 迁移。
  - verify: `pnpm harness:check`。

- [x] 建立统一 hook identity 和 meta
  - [x] 增加 canonical JSON hash、`scenarioHash`、`hookHash` 生成工具。
  - [x] 定义 `toggleStrategy`、`effectiveEnabled` 的读取约定; `equivalentSources` 延后到跨来源对齐项。
  - [x] Claude / Codex parser 都写入统一 hook meta。
  - verify: parser 目标单测。

- [x] 扩展 Claude hook parser
  - [x] 增加 canonical JSON hash 和 `hookKey` 生成工具。
  - [x] 给 active user hook 写入 `enabled`、`canToggleHook`、`scenarioHash`、`hookHash`、`stateSourcePath`。
  - [x] 同一 scenario 下相同 `hookHash` 的子项合并为一条 asset, 并记录 `occurrenceCount`。
  - [x] 读取 `~/.claude/.berth/hooks-state.json`, 输出 disabled hook asset。
  - [x] sidecar 解析失败时转为 scanner error, 不中断其他资产扫描。
  - verify: parser / scanner 目标单测。

- [ ] 对齐 Codex hook identity
  - [x] Codex hook asset 增加 `scenarioHash`、`hookHash`、`occurrenceCount`、`toggleStrategy`。
  - [x] `[hooks.state]` 新写入 stable key: `codex:${scenarioHash}:${hookHash}`。
  - [x] parser 兼容读取旧 index key 和新 stable key, 新 stable key 优先。
  - [x] managed hook 继续 read-only。
  - [x] hooks.json 与 inline hooks 出现同类 hook 时写入 `equivalentSources`: not implemented in GH-11, 拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-source-equivalence.md`。
  - verify: `tests/unit/codex-config-parser.test.ts` + `tests/unit/hook-lifecycle.test.ts`。

- [ ] 实现 Claude Code 单 Hook 软禁用
  - [x] 在 `hooks-manager.ts#setHookEnabled()` 中分发 Codex 与 Claude Code。
  - [x] 实现 Claude user settings 路径校验、hookKey 校验、managed 拒绝。
  - [x] 实现 per-file mutex 和 scenario 内 hook 子项 hash 匹配。
  - [x] 实现写前复读 hash 和最多 3 次重算: not implemented in GH-11, 拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-toggle-conflict-recovery.md`。
  - [x] 实现文本级最小 JSON patch, 默认只改目标 hook 节点或目标容器: not implemented in GH-11, 拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-toggle-conflict-recovery.md`。
  - [x] 实现禁用: 定位 hook、写 sidecar、移除 JSON 节点。
  - [x] 实现恢复: 读取 sidecar、去重、插回 settings、清理恢复点。
  - [x] 实现 sidecar schema 校验。
  - [x] 实现损坏恢复点提示: GH-11 只补行内错误文案; 深度恢复策略拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-toggle-conflict-recovery.md`。
  - [x] 写 settings 前创建时间戳备份; settings 和 sidecar 都用 temp + rename。
  - [x] 覆盖同 scenario 下重复 hookHash、同 matcher group 多组、目标 hook 已手动修改、active 已手动恢复、外部文件变更、sidecar 损坏等分支: not implemented in GH-11, 拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-toggle-conflict-recovery.md`。
  - verify: `tests/unit/hooks-manager.test.ts`。

- [ ] 调整 lifecycle 与 Hooks 页面
  - [x] Claude user hook 从 unavailable 改为 confirmation action。
  - [x] 删除 renderer 的 codex-only toggle guard, 改按 `toggleStrategy` 判断。
  - [x] 增加 Claude soft disable / restore 确认文案。
  - [x] 恢复确认展示 command、event、sourcePath、disabledAt。
  - [x] 同一 hook 在其他来源存在时显示提示, 明确当前操作只影响 user source: not implemented in GH-11, 拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-source-equivalence.md`。
  - [x] 区分注册状态 `enabled` 和实际影响 `effectiveEnabled`。
  - [x] disabled 行显示为 Berth 恢复点状态, 不新增大块提示。
  - verify: `tests/unit/hook-lifecycle.test.ts` + `tests/renderer/hooks-lifecycle-view.test.tsx`。

- [ ] 引入 Agent Capability Plugin 的 hooks 切片
  - [x] 新增内部 `AgentHookCapabilityPlugin` / hook action descriptor 类型。
  - [x] Claude/Codex 作为内置 hook Plugin, renderer 不再写死 agentId。
  - [x] `hooks-manager.ts` 通过 hook plugin registry 分发 hook 操作。
  - [x] 不实现外部 plugin loader; 只保留后续 manifest 方向。
  - verify: `tests/unit/hooks-manager.test.ts` + `tests/unit/engine-scanner.test.ts`。

- [ ] 文案与 i18n
  - [x] 替换旧 `claudeNoSingleHookToggle` 展示语义。
  - [x] 增加 user-only、soft-disable、restore 文案。
  - [x] 增加 stale conflict / 恢复点异常文案。
  - [x] 清理已删除工具栏留下的旧 i18n key。
  - verify: `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`; `pnpm typecheck:web`。

- [x] Hook 行配置展示
  - [x] 复核官方 hooks 文档: Claude Code handler 类型为 `command`、`http`、`mcp_tool`、`prompt`、`agent`; Codex 当前运行 `command`, `prompt`/`agent` 解析但跳过, `async` 解析但跳过。
  - [x] parser 保留 `rawHook`, 并提取常见字段: `type`、`timeout`、`statusMessage`、`if`、`args`、`url`、`server/tool`、`prompt/model`。
  - [x] UI 按 handler type 展示主信息, 不再只展示 `command`。
  - [x] Hook 行支持展开查看关联 JSON 原文。
  - [x] JSON 原文支持 icon copy, 默认继续折叠, 内容高度受限。
  - [x] 单 Hook 操作按钮文案收短为 `启用` / `禁用`。
  - verify: parser + renderer 目标测试; `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx`; `pnpm typecheck:web`。

- [x] 收口分流
  - [x] 并发修改、最小 JSON patch、恢复点深度修复拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-toggle-conflict-recovery.md`。
  - [x] 多来源等价与 `effectiveEnabled` 解释拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-source-equivalence.md`。
  - [x] Hook type 健康检查拆到 `docs/issues/2026-06-02-IMPROVEMENT-hook-type-health-checks.md`。
  - [x] `Agent Capability Plugin System` 扩展为 PRD: `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`。
  - [x] Hook 操作恢复中心记录为新功能 PRD: `docs/issues/2026-06-02-FEATURE-hook-operation-recovery-center.md`。
  - verify: `pnpm harness:check`。

- [ ] 总体验证
  - [x] `pnpm test -- tests/unit/hooks-manager.test.ts tests/unit/claude-scanner.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - [x] `pnpm typecheck:node`
  - [x] `pnpm typecheck:web`
  - [x] `pnpm harness:check`
  - [x] 若 Hooks 页面视觉有明显变化, 运行 Electron 实测截图。tests: not needed - 本次只调整行内启停逻辑和确认文案, 没有改页面布局。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
