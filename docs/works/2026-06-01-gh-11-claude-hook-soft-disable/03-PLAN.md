# 任务清单 (Design 产物 / 活清单)

## Implementation

- [ ] 扩展 Claude hook parser
  - [ ] 增加 canonical JSON hash 和 `hookKey` 生成工具。
  - [ ] 给 active user hook 写入 `enabled`、`canToggleHook`、`definitionHash`、`stateSourcePath`、`sourceContentHash`。
  - [ ] 读取 `~/.claude/.berth/hooks-state.json`, 输出 disabled hook asset。
  - [ ] sidecar 解析失败时转为 scanner error, 不中断其他资产扫描。
  - verify: parser / scanner 目标单测。

- [ ] 实现 Claude Code 单 Hook 软禁用
  - [ ] 在 `hooks-manager.ts#setHookEnabled()` 中分发 Codex 与 Claude Code。
  - [ ] 实现 Claude user settings 路径校验、hookKey 校验、managed 拒绝。
  - [ ] 实现 per-file mutex、sourceContentHash 写前检查、写前复读 hash。
  - [ ] 实现禁用: 定位 hook、写 sidecar、移除 JSON 节点。
  - [ ] 实现恢复: 读取 sidecar、去重、插回 settings、清理恢复点。
  - [ ] 写 settings 前创建时间戳备份; settings 和 sidecar 都用 temp + rename。
  - [ ] 覆盖同 hash 多条、同 matcher group 多组、active 已手动恢复、外部文件变更等冲突分支。
  - verify: `tests/unit/hooks-manager.test.ts`。

- [ ] 调整 lifecycle 与 Hooks 页面
  - [ ] Claude user hook 从 unavailable 改为 confirmation action。
  - [ ] 删除 renderer 的 codex-only toggle guard。
  - [ ] 增加 Claude soft disable / restore 确认文案。
  - [ ] disabled 行显示为 Berth 恢复点状态, 不新增大块提示。
  - verify: `tests/unit/hook-lifecycle.test.ts` + `tests/renderer/hooks-lifecycle-view.test.tsx`。

- [ ] 文案与 i18n
  - [ ] 替换旧 `claudeNoSingleHookToggle` 展示语义。
  - [ ] 增加 user-only、soft-disable、restore、stale conflict、ambiguous conflict 文案。
  - verify: renderer 目标测试。

- [ ] 总体验证
  - [ ] `pnpm test -- tests/unit/hooks-manager.test.ts tests/unit/claude-scanner.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx`
  - [ ] `pnpm typecheck:node`
  - [ ] `pnpm typecheck:web`
  - [ ] `pnpm harness:check`
  - [ ] 若 Hooks 页面视觉有明显变化, 运行 Electron 实测截图。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
