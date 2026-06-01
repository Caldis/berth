# 任务清单 (Design 产物 / 活清单)

## Implementation

- [ ] 扩展 Claude hook parser
  - [ ] 增加 canonical JSON hash 和 `hookKey` 生成工具。
  - [ ] 给 active user hook 写入 `enabled`、`canToggleHook`、`scenarioHash`、`hookHash`、`stateSourcePath`。
  - [ ] 同一 scenario 下相同 `hookHash` 的子项合并为一条 asset, 并记录 `occurrenceCount`。
  - [ ] 读取 `~/.claude/.berth/hooks-state.json`, 输出 disabled hook asset。
  - [ ] sidecar 解析失败时转为 scanner error, 不中断其他资产扫描。
  - verify: parser / scanner 目标单测。

- [ ] 对齐 Codex hook identity
  - [ ] Codex hook asset 增加 `scenarioHash`、`hookHash`、`occurrenceCount`、`toggleStrategy`。
  - [ ] 保留现有 `[hooks.state]` 写入策略, 但状态 key 迁移到稳定 identity 或兼容旧 key。
  - [ ] managed hook 继续 read-only。
  - [ ] hooks.json 与 inline hooks 出现同类 hook 时写入 `equivalentSources`。
  - verify: `tests/unit/codex-config-parser.test.ts` + `tests/unit/hook-lifecycle.test.ts`。

- [ ] 实现 Claude Code 单 Hook 软禁用
  - [ ] 在 `hooks-manager.ts#setHookEnabled()` 中分发 Codex 与 Claude Code。
  - [ ] 实现 Claude user settings 路径校验、hookKey 校验、managed 拒绝。
  - [ ] 实现 per-file mutex、scenario 内 hook 子项 hash 匹配、写前复读 hash 和最多 3 次重算。
  - [ ] 实现文本级最小 JSON patch, 默认只改目标 hook 节点或目标容器。
  - [ ] 实现禁用: 定位 hook、写 sidecar、移除 JSON 节点。
  - [ ] 实现恢复: 读取 sidecar、去重、插回 settings、清理恢复点。
  - [ ] 实现 sidecar schema 校验和损坏恢复点提示。
  - [ ] 写 settings 前创建时间戳备份; settings 和 sidecar 都用 temp + rename。
  - [ ] 覆盖同 scenario 下重复 hookHash、同 matcher group 多组、目标 hook 已手动修改、active 已手动恢复、外部文件变更、sidecar 损坏等分支。
  - verify: `tests/unit/hooks-manager.test.ts`。

- [ ] 调整 lifecycle 与 Hooks 页面
  - [ ] Claude user hook 从 unavailable 改为 confirmation action。
  - [ ] 删除 renderer 的 codex-only toggle guard, 改按 `toggleStrategy` 判断。
  - [ ] 增加 Claude soft disable / restore 确认文案。
  - [ ] 恢复确认展示 command、event、sourcePath、disabledAt。
  - [ ] 同一 hook 在其他来源存在时显示提示, 明确当前操作只影响 user source。
  - [ ] 区分注册状态 `enabled` 和实际影响 `effectiveEnabled`。
  - [ ] disabled 行显示为 Berth 恢复点状态, 不新增大块提示。
  - verify: `tests/unit/hook-lifecycle.test.ts` + `tests/renderer/hooks-lifecycle-view.test.tsx`。

- [ ] 收口 adapter 边界
  - [ ] 新增内部 `AgentCapabilityAdapter` / hook action descriptor 类型。
  - [ ] Claude/Codex adapter 先实现 hook action descriptor, renderer 不再写死 agentId。
  - [ ] `hooks-manager.ts` 通过 adapter registry 分发 hook 操作。
  - [ ] 记录外部 plugin manifest 草案, 本任务不实现外部 plugin 加载。
  - verify: `tests/unit/hooks-manager.test.ts` + `tests/unit/engine-scanner.test.ts`。

- [ ] 文案与 i18n
  - [ ] 替换旧 `claudeNoSingleHookToggle` 展示语义。
  - [ ] 增加 user-only、soft-disable、restore、stale conflict 文案。
  - verify: renderer 目标测试。

- [ ] 总体验证
  - [ ] `pnpm test -- tests/unit/hooks-manager.test.ts tests/unit/claude-scanner.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - [ ] `pnpm typecheck:node`
  - [ ] `pnpm typecheck:web`
  - [ ] `pnpm harness:check`
  - [ ] 若 Hooks 页面视觉有明显变化, 运行 Electron 实测截图。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
