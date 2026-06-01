# 技术方案 (Design 产物)

## 数据与错误契约

新增内部错误类型:

- `HookSourceChangedError`: 写入前发现 settings 文本与本轮读取文本不同, 调用方重试。
- `HookTargetConflictError`: 目标 hook 已被修改或移除, 停止写入。
- `HookRestoreStateError`: sidecar 缺失或损坏, 停止写入。

Renderer 继续通过 error message 映射为本地化文案, 不改 IPC schema。

## 实现方案

- `setClaudeHookEnabled()` 保持 per-file lock。
- 新增 `withClaudeHookRetry(operation)`:
  - 最多 3 次。
  - 每次调用 operation 都重新读取 settings/sidecar。
  - 捕获 `HookSourceChangedError` 后重试。
  - 其他错误直接抛出。
- settings 写入改为 `writeJsonFileIfUnchanged(filePath, value, expectedText)`。
  - 写入前重新读当前文件。
  - 当前文本与 expectedText 不同则抛 `HookSourceChangedError`。
  - 仍复用 temp + rename 与备份。
- disable 流程:
  - 每次尝试重新读 sidecar/settings。
  - 从当前 settings 删除 matching hook。
  - 若找不到且已有 restore point, 返回 changed=false。
  - 若找不到且无 restore point, 抛目标冲突。
  - 先写 settings, 再写 sidecar; sidecar 失败时尝试回滚 settings 到本次 expected settings 文本。
- restore 流程:
  - 每次尝试重新读 sidecar/settings。
  - sidecar entry 缺失但 active hook 已存在: 返回 changed=false。
  - active hook 已存在且 sidecar entry 存在: 清理 sidecar, 返回 changed=false。
  - 否则插入 hook, 写 settings, 再写 sidecar。

## 测试策略

| 行为 | 测试文件 | 命令 |
|---|---|---|
| 写前外部修改无关字段后重试 | `tests/unit/hooks-manager.test.ts` | `pnpm test -- tests/unit/hooks-manager.test.ts` |
| 目标 hook 被修改时停止写入 | `tests/unit/hooks-manager.test.ts` | `pnpm test -- tests/unit/hooks-manager.test.ts` |
| active hook 已手动恢复时清理 restore point 且 changed=false | `tests/unit/hooks-manager.test.ts` | `pnpm test -- tests/unit/hooks-manager.test.ts` |
| sidecar 损坏不写 settings | `tests/unit/hooks-manager.test.ts` | `pnpm test -- tests/unit/hooks-manager.test.ts` |
| renderer 冲突错误文案 | `tests/renderer/hooks-lifecycle-view.test.tsx` | `pnpm test -- tests/renderer/hooks-lifecycle-view.test.tsx` |
| 类型检查 | n/a | `pnpm typecheck:node`; `pnpm typecheck:web` |

## 界面质量与交互验收

- 不增加新面板。
- 错误只显示在当前 Hook 行内, 使用现有小号错误文本。
- 文案说明“刷新后再试 / restore point 损坏 / 文件正在变化”, 不暴露堆栈或低层异常。
