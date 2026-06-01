# 技术方案 (Design 产物)

## 目标

给 Claude Code user-scope hook 增加单项软禁用能力:

- 禁用时, 从 `~/.claude/settings.json` 的 active `hooks` JSON 中移除对应 hook 节点。
- Berth 在 `~/.claude/.berth/hooks-state.json` 保存恢复点, 用于页面继续展示 disabled hook, 并支持恢复。
- 每次写 Claude settings 前创建时间戳整文件备份, 写入使用同目录临时文件再 rename。
- Codex 现有 `[hooks.state]` 切换能力保持不变。
- 初版只支持 Claude Code user scope; project/local/enterprise 继续只读。

## 不做

- 不给 Claude hook object 增加 `enabled: false`。官方没有该字段, 可能造成 UI 和实际执行不一致。
- 不把 event key、matcher group 或 command 改名为 `_disabled_*`。这会把非官方结构留在 Claude settings 中。
- 不把 command 改成 no-op。恢复成本高, 也会破坏用户原始命令。
- 不写 project `.claude/settings.json` 或 `.claude/settings.local.json`。这类文件可能属于仓库或本地项目状态, 需要单独确认和 diff 视图。

## 数据模型

### Hook key

Claude active hook 解析时生成稳定 key:

```ts
type ClaudeHookKey = `claude-code:${string}:${number}:${number}:${string}`
```

字段含义:

- `event`: Claude hook event, 例如 `PreToolUse`、`PostToolUse`、`Stop`。
- `handlerIndex`: `settings.hooks[event]` 数组里的 handler 位置。
- `hookIndex`: nested `handler.hooks` 里的位置; direct handler 模式固定为 `0`。
- `definitionHash`: 对 `{ event, mode, matcher, hook }` 做 canonical JSON 后的 hash。

禁用时按下面顺序定位:

1. sourcePath、event、handlerIndex、hookIndex 精确命中, 且 hash 一致。
2. 若位置已变化, 在同一 sourcePath + event 内按 definitionHash 查找唯一 active hook。
3. 找不到或找到多条时返回 stale conflict, 要求刷新后重试。

### Asset meta

Claude hook asset 增加以下 `meta` 字段:

```ts
interface ClaudeHookMeta {
  event: string
  eventType: string
  matcher?: string
  command?: string
  hookType?: string
  entryPaths: string[]
  handlerIndex: number
  hookIndex: number
  hookKey: string
  definitionHash: string
  enabled: boolean
  canToggleHook: boolean
  stateSourcePath: string
  disabledByBerth?: boolean
  disabledAt?: string
}
```

规则:

- active user hook: `enabled: true`, `canToggleHook: true`。
- disabled sidecar hook: `enabled: false`, `canToggleHook: true`, `disabledByBerth: true`。
- project/local/enterprise hook: `canToggleHook: false`, 并在 lifecycle helper 返回明确不可用原因。

### Sidecar

路径:

```txt
~/.claude/.berth/hooks-state.json
```

结构:

```ts
interface ClaudeHooksStateFile {
  version: 1
  disabled: Record<string, ClaudeDisabledHookEntry>
}

interface ClaudeDisabledHookEntry {
  agentId: 'claude-code'
  sourcePath: string
  scope: 'user'
  event: string
  mode: 'nested' | 'direct'
  handlerIndex: number
  hookIndex: number
  matcher?: string
  handler: Record<string, unknown>
  hook: Record<string, unknown>
  definitionHash: string
  disabledAt: string
}
```

保存 `handler` 是为了恢复 matcher group 的非 hook 字段; 保存 `hook` 是为了精确恢复被移除的节点。

## Main Process 设计

### `setHookEnabled()`

`src/main/engine/hooks-manager.ts#setHookEnabled()` 改为按 agent 分发:

- `agentId === 'codex'`: 保持现有 `hooks.state` 行为。
- `agentId === 'claude-code'`: 进入 `setClaudeHookEnabled()`。
- 其他 agent: 抛出 unsupported。

请求仍复用现有 IPC:

```ts
interface SetHookEnabledRequest {
  agentId: HooksAgentId
  scope: 'user'
  hookKey: string
  sourcePath: string
  enabled: boolean
  managed?: boolean
}
```

初版不扩展 `scope` union, 避免误让 UI 发送 project/local 写入请求。

### 禁用流程

`setClaudeHookEnabled(request.enabled === false)`:

1. 校验:
   - `scope === 'user'`
   - `managed !== true`
   - `sourcePath` resolve 后等于当前 Claude user settings 路径。
   - `hookKey` 为 Claude key。
2. 读取并解析 `sourcePath` JSON。非法 JSON 返回错误, 不写文件。
3. 定位 hook。优先 exact index, 再 fallback 到唯一 hash。
4. 创建 sidecar entry。
5. 从 active JSON 中移除 hook:
   - nested mode: 删除 `handler.hooks[hookIndex]`; 若该数组清空, 删除整个 handler。
   - direct mode: 删除 `settings.hooks[event][handlerIndex]`。
   - 若 event 数组清空, 删除 `settings.hooks[event]`。
6. 先写时间戳备份:
   - `settings.json.berth-backup-YYYYMMDDTHHMMSSmmmZ`
7. 写 settings:
   - `settings.json.berth-tmp-${pid}-${nonce}`
   - `rename(tmp, settings.json)`
8. 写 sidecar。sidecar 写入也使用 temp + rename, 但不需要备份。

如果 sidecar 已有同一 `definitionHash` 的 disabled entry, 禁用应返回 no-op 成功, 不重复写入。

### 恢复流程

`setClaudeHookEnabled(request.enabled === true)`:

1. 校验 user scope、sourcePath、hookKey。
2. 读取 sidecar entry; 不存在则检查 active settings:
   - 若 active 中已有同一 hash, 返回 no-op 成功。
   - 否则返回 “找不到恢复点”。
3. 读取 settings JSON。
4. 若 active settings 已有同一 definitionHash:
   - 清理 sidecar entry。
   - 返回成功。
5. 恢复:
   - nested mode:
     - 若原 handlerIndex 位置存在同 matcher 的 nested handler, 插入到原 hookIndex 附近。
     - 否则插入保存的 handler, 其中 `hooks` 只包含保存的 hook。
   - direct mode:
     - 将保存的 hook 作为 handler 插入到原 handlerIndex 附近。
6. 写 settings 备份 + temp rename。
7. 清理 sidecar entry, temp rename 写 sidecar。

## Parser / Scanner 设计

`src/main/adapters/claude-code/parsers.ts#parseHooks()`:

- active hooks:
  - 为每条 Claude hook 增加 `hookKey`、`definitionHash`、`enabled: true`。
  - 只有 `scope === 'user'` 且 source 是 `~/.claude/settings.json` 时 `canToggleHook: true`。
- disabled hooks:
  - user settings 解析时读取 `~/.claude/.berth/hooks-state.json`。
  - 将 sidecar entry 转成 `CapabilityAsset`。
  - `path` 使用原 `sourcePath`, `meta.enabled = false`, `meta.disabledByBerth = true`。
  - 如果 active settings 中已经有同 hash hook, 不展示 disabled 副本, 避免同一 hook 出现两行。
- 解析 sidecar 失败:
  - 不让整个 scanner 失败。
  - 追加 scanner error, 页面显示对应配置问题。

## Renderer 设计

`src/renderer/src/lib/hook-lifecycle.ts`:

- Claude Code user hook:
  - `meta.canToggleHook === true` 且有 `meta.hookKey` -> `needs-confirmation`。
  - `meta.enabled === false` -> action 文案为 Enable hook。
- Claude Code 非 user / managed:
  - 返回 unavailable, reason 改成 “仅支持用户级 Claude Code Hook 软禁用”。
- 保留 Codex 原逻辑。

`src/renderer/src/components/capabilities/hooks-lifecycle-view.tsx`:

- 删除 `toggleHook()` 里的 `hook.agentId !== 'codex'` 硬判断。
- Claude Code disable 确认文案说明:
  - 将修改的 settings 路径。
  - Berth 会把该 hook 从 Claude active 配置中移除。
  - Berth 会保存恢复点和整文件备份。
- Claude Code enable 确认文案说明:
  - 将从 Berth 恢复点写回 Claude settings。
  - 如果 active 配置里已有同一 hook, 会清理恢复点。
- 行内状态:
  - active: 继续显示当前启用 tag。
  - disabled: 显示 disabled tag, hover/详情里说明这是 Berth 保存的恢复点。
- 行内错误继续显示在当前行附近, 不增加全局提示。

## 文案

替换旧文案:

```txt
Claude Code 没有支持“保留注册但单独禁用一个 Hook”的机制
```

新文案:

```txt
Claude Code 没有原生单 Hook 状态。Berth 会从用户级 settings 中暂时移除该 Hook, 并保存恢复点。
```

非 user scope:

```txt
当前只支持用户级 Claude Code Hook。项目级和受管理配置保持只读。
```

## 测试

单元测试:

- `tests/unit/hooks-manager.test.ts`
  - 禁用 nested Claude hook 会从 `settings.hooks` 删除目标 hook, 写 sidecar。
  - nested handler 被清空时删除 handler; event 清空时删除 event。
  - 恢复 sidecar hook 会写回 settings 并清理 sidecar。
  - active 已有同 hash 时恢复为 no-op 并清理 sidecar。
  - stale key、source mismatch、managed、非 user scope 返回错误。
  - Codex `hooks.state` 现有测试保持通过。
- `tests/unit/claude-scanner.test.ts` 或 parser 相关测试
  - active user hook 带 `hookKey`、`definitionHash`、`enabled`、`canToggleHook`。
  - sidecar disabled hook 会被展示。
  - active 中已有同 hash 时不展示 sidecar duplicate。
- `tests/unit/hook-lifecycle.test.ts`
  - Claude user hook 可进入 confirmation 状态。
  - Claude project/managed hook 不可切换。
- `tests/renderer/hooks-lifecycle-view.test.tsx`
  - Claude disable/enable 行为会调用 IPC。
  - 旧不可用文案不再出现在 user hook 上。

验证命令:

```bash
pnpm test -- tests/unit/hooks-manager.test.ts tests/unit/claude-scanner.test.ts tests/unit/hook-lifecycle.test.ts tests/renderer/hooks-lifecycle-view.test.tsx
pnpm typecheck:node
pnpm typecheck:web
pnpm harness:check
```

如果实现改动影响 Hooks 页面布局, 再按项目视觉验收要求跑 Electron 实测截图。
