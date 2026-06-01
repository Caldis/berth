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

## 局部冲突模型

这个功能不能把整份 `settings.json` 当作版本控制单位。Claude settings 是高频修改文件, 用户、Claude Code 和其他本地工具都可能修改无关段落。Berth 的冲突判断只围绕“目标 hook”和“目标 hook 所在容器”:

- hook 身份: `definitionHash`, 由 `{ event, mode, matcher, hook }` 的 canonical JSON 计算。
- 容器选择器: `event + mode + matcher`。它只用于恢复时寻找应插入的位置。
- 文件快照 hash: 只用于写入前发现极短时间内的并行写入, 不用于拒绝旧 UI 发起的操作。

换句话说, 页面扫描后 settings 被别的工具改了也不一定失败。只要当前文件里还能唯一识别目标 hook, Berth 就基于当前文件继续做最小修改。

### 并行控制

1. Berth 进程内用 per-file mutex 串行化同一 settings 文件操作。
   - 同一 app 内的双击、两个窗口、连续 enable/disable 不并行写同一文件。
   - 这个锁只解决 Berth 内部并发; 外部编辑器不会遵守它。
2. main process 每次操作都重新读取当前文件。
   - 不使用 renderer 传来的旧 JSON。
   - 不因为整文件 hash 变化直接失败。
3. transform 基于当前 JSON 执行。
   - 禁用只删除目标 hook 节点。
   - 恢复只插入 sidecar 里的 hook 节点。
   - 其他 event、matcher group、hook 保持当前文件里的内容。
4. 写入前复读文件 hash。
   - 如果文件从本次 transform 开始后又变了, 重新读取最新文件并重算 transform。
   - 最多重试 3 次。
   - 仍持续变化或变成无法判断时, 返回冲突。
5. 外部并行写入无法被 100% 阻止。
   - 在没有跨平台强制文件锁且外部工具不配合的情况下, 任何工具都无法完全消除“最终 hash 检查之后、rename 之前”的极短竞态。
   - Berth 的保证是: 尽量基于最新文件合并; 无法唯一判断时拒绝写入; 每次 settings 写入前都有整文件备份。

### 禁用时的局部判断

禁用操作输入包含:

- `hookKey`
- `definitionHash`
- `sourcePath`

处理规则:

1. 优先按 `hookKey` 中的 event / handlerIndex / hookIndex 定位。
   - 该位置仍是同一 `definitionHash`: 删除。
   - 该位置已变成其他 hook: 不删除, 进入 hash 搜索。
2. 在当前 settings 中搜索同一 `definitionHash`。
   - 找到唯一一条: 删除这一条。
   - 找到零条: 若 sidecar 已有该 hash 的 disabled entry, 返回 no-op; 否则返回 stale conflict。
   - 找到多条: 返回 ambiguous conflict, 不猜测删除哪一条。
3. 同一 event / matcher 下出现相似但 hash 不同的 hook:
   - 视为用户或其他工具改过内容。
   - 不作为同一条 hook。
   - 不删除, 返回 stale conflict。

这个规则允许用户或其他软件修改无关段落, 也允许同一 event 下新增其他 hook。只有目标 hook 本身被改掉、删掉或复制成多份时才冲突。

### 恢复时的局部判断

恢复操作以 sidecar entry 为准, 但必须合并到当前 settings:

1. 当前 active settings 已有同一 `definitionHash`:
   - 视为用户已经手动恢复。
   - 不再插入重复 hook。
   - 清理 sidecar entry。
2. 当前没有同一 hash, 且存在唯一同一容器选择器:
   - nested mode 插入到这个 matcher group 的 `hooks` 数组。
   - 保留当前 matcher group 的其他字段, 不用 sidecar 覆盖。
3. 当前有多个同一容器选择器:
   - 若原 handlerIndex 命中其中一个, 插入该位置。
   - 否则返回 ambiguous conflict。
4. 当前没有同一容器选择器:
   - 插入 sidecar 保存的 handler。
   - 只插入要恢复的 hook, 不覆盖其他当前内容。
5. 原位置已有不同 hook:
   - 不覆盖原位置。
   - 插入到原位置之后或当前数组尾部。

这里的“同名段落”按 Claude Hook 结构解释为 `event + matcher group`。真正表示“同一条 hook”的依据只能是 `definitionHash`。

### 风险与进一步优化

1. 文本被整文件重写
   - 风险: 当前仓库对 Claude settings 使用 `JSON.parse` / `JSON.stringify`。如果实现沿用这个方式, 即使只删除一个 hook, 文件缩进、换行和 key 顺序也可能被重写。
   - 影响: 语义正确, 但用户手动维护的格式会丢失, 外部工具也更容易看到大面积 diff。
   - 规避: 实现前引入文本级 JSON patch。优先用 AST 定位 `hooks[event][handlerIndex].hooks[hookIndex]` 或 direct handler 的文本范围, 只删除或插入目标数组元素。解析失败时不写。整文件 `JSON.stringify` 只作为测试夹具或明确的 fallback, 不作为默认写入路径。
2. 目标 hook 被用户改了
   - 风险: 用户在页面扫描后改了 command、type 或 matcher。此时原 `definitionHash` 找不到。
   - 影响: Berth 不知道用户想禁用“旧 hook”还是“改过后的新 hook”。
   - 规避: 返回 stale conflict, 提示刷新后重试。不按相似 command 或同名 matcher 猜测。
3. 同一 hook 被复制成多份
   - 风险: 当前文件里出现多条相同 `definitionHash`。
   - 影响: 如果原 index 仍命中, 可以安全删除该位置; 如果原位置已经移动或变成别的 hook, 无法知道用户要删哪一条。
   - 规避: 原 index 命中时删除原 index; 否则返回 ambiguous conflict。后续可在 row 中显示重复来源和 index, 让用户手动选择。
4. 同一 event + matcher group 出现多份
   - 风险: 恢复时有多个可插入容器。
   - 影响: 插错 group 可能改变执行顺序或触发条件。
   - 规避: 原 handlerIndex 命中时使用原位置; 否则返回 ambiguous conflict。不要为了成功恢复而随便选第一组。
5. 用户手动恢复了 hook
   - 风险: sidecar 还在, active settings 里已经有同一 hook。
   - 影响: 页面可能出现 active 与 disabled 两条重复记录。
   - 规避: parser 隐藏 sidecar duplicate; enable 操作只清理 sidecar, 不再插入重复 hook。
6. sidecar 被删或损坏
   - 风险: disabled hook 不再能单独恢复。
   - 影响: 用户只能从整文件备份或手动配置恢复。
   - 规避: sidecar 解析失败只影响 disabled 恢复点, 不阻断 active hooks 扫描; 页面显示恢复点损坏提示。禁用时仍保留时间戳整文件备份。
7. sidecar 被手动或恶意篡改
   - 风险: 恢复操作可能把 sidecar 里的命令写回 Claude settings。
   - 影响: 本地有写权限的进程本来就能直接改 settings, 但 Berth 不应静默恢复可疑内容。
   - 规避: 恢复必须由用户确认; 确认中展示 command、event、sourcePath 和 disabledAt。sidecar entry 必须通过 schema 校验, sourcePath 必须是当前 user settings。
8. 全局 `disableAllHooks` 与单 hook 软禁用混淆
   - 风险: `disableAllHooks: true` 时, active settings 里存在的 hook 也不会实际运行。
   - 影响: 行级 `enabled` 容易被误读为“运行中”。
   - 规避: Claude hook 行里的 `enabled` 只表示“是否被 Berth soft disable”。全局是否运行由 Agent 级 hooks 状态展示。必要时给行状态增加 hover 说明。
9. 其他 scope 中存在同一 hook
   - 风险: 禁用 user settings 中的一条 hook 后, project/local/managed 里仍有同一 hook。
   - 影响: 用户可能以为已禁用, 但 Claude 最终仍可能从其他来源执行同类 hook。
   - 规避: 扫描时按 `definitionHash` 汇总跨来源 duplicate。行内提示“其他来源仍存在同一 hook”, 禁用操作只声明影响当前 user source。
10. 写入期间外部进程持续修改文件
    - 风险: 写前复读和重算一直遇到变化。
    - 影响: 操作失败。
    - 规避: 最多重试 3 次后返回 conflict。不要长时间阻塞 UI, 也不要覆盖外部正在写入的内容。
11. Windows 文件占用或权限问题
    - 风险: 杀毒软件、编辑器或权限设置导致 backup、tmp write、rename 失败。
    - 影响: 操作失败, 可能留下 tmp 文件。
    - 规避: 写失败时清理 tmp; 返回具体文件错误; 不修改 sidecar 清理状态。整文件备份必须先于 settings rename 成功。
12. 备份文件增长
    - 风险: 高频开关会产生很多 `settings.json.berth-backup-*`。
    - 影响: 用户目录里积累备份文件。
    - 规避: 初版不自动删除备份, 避免误删恢复材料。后续可做只清理 Berth 命名备份的保留策略, 例如保留最近 50 个并在 UI 中提供清理入口。

实现优先级:

1. 必做: 文本级最小 JSON patch、局部 hash 匹配、per-file mutex、写前复读重算、sidecar schema 校验、跨来源 duplicate 提示。
2. 可后续: 备份保留策略、重复 hook 手动选择 UI、从整文件备份恢复单条 hook。

### 写入顺序

禁用优先保证可恢复:

1. 从当前 settings 构造 sidecar entry。
2. 先写 sidecar。
3. 再写 settings 删除 active hook。
4. 若 settings 写失败, sidecar 可能残留; parser 会因为 active 中仍有同 hash hook 而隐藏 disabled 副本。

恢复也优先保证恢复点不丢:

1. 先写 settings 插回 hook。
2. 再清理 sidecar。
3. 若 sidecar 清理失败, parser 会因为 active 中已有同 hash hook 而隐藏 disabled 副本, 下次操作可继续清理。

这两个顺序都避免出现“settings 已改, 但恢复点丢失”的不可恢复状态。

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

初版不扩展 `scope` union, 避免误让 UI 发送 project/local 写入请求。Claude Code 的目标身份从 `hookKey` 内的 `definitionHash` 解析, 不要求 UI 传整文件 hash。

### 禁用流程

`setClaudeHookEnabled(request.enabled === false)`:

1. 校验:
   - `scope === 'user'`
   - `managed !== true`
   - `sourcePath` resolve 后等于当前 Claude user settings 路径。
   - `hookKey` 为 Claude key。
2. 进入 settings 文件 mutex。
3. 读取并解析 `sourcePath` JSON。非法 JSON 返回错误, 不写文件。
4. 按局部冲突模型定位 hook。
5. 创建 sidecar entry。
6. 先写 sidecar, 保证恢复点早于 settings 删除。
7. 从 active JSON 中移除 hook:
   - nested mode: 删除 `handler.hooks[hookIndex]`; 若该数组清空, 删除整个 handler。
   - direct mode: 删除 `settings.hooks[event][handlerIndex]`。
   - 若 event 数组清空, 删除 `settings.hooks[event]`。
8. 先写时间戳备份:
   - `settings.json.berth-backup-YYYYMMDDTHHMMSSmmmZ`
9. 写 settings:
   - `settings.json.berth-tmp-${pid}-${nonce}`
   - `rename(tmp, settings.json)`
10. 如果写前复读发现文件又变了, 重新读取并重算禁用 transform, 最多 3 次。
11. 退出 mutex。

如果 sidecar 已有同一 `definitionHash` 的 disabled entry, 禁用应返回 no-op 成功, 不重复写入。

### 恢复流程

`setClaudeHookEnabled(request.enabled === true)`:

1. 校验 user scope、sourcePath、hookKey。
2. 进入 settings 文件 mutex。
3. 读取 sidecar entry; 不存在则检查 active settings:
   - 若 active 中已有同一 hash, 返回 no-op 成功。
   - 否则返回 “找不到恢复点”。
4. 读取 settings JSON。
5. 若 active settings 已有同一 definitionHash:
   - 清理 sidecar entry。
   - 返回成功。
6. 按局部冲突模型恢复:
   - nested mode:
     - 若原 handlerIndex 位置存在同 matcher 的 nested handler, 插入到原 hookIndex 附近。
     - 否则插入保存的 handler, 其中 `hooks` 只包含保存的 hook。
   - direct mode:
     - 将保存的 hook 作为 handler 插入到原 handlerIndex 附近。
7. 写 settings 备份 + temp rename。
8. 如果写前复读发现文件又变了, 重新读取并重算恢复 transform, 最多 3 次。
9. 清理 sidecar entry, temp rename 写 sidecar。
10. 退出 mutex。

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
