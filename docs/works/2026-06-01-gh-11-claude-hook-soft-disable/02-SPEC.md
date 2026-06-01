# 技术方案 (Design 产物)

## 目标

给 Claude Code user-scope hook 增加单项软禁用能力:

- 禁用时, 从 `~/.claude/settings.json` 的 active `hooks` JSON 中移除对应 hook 节点。
- Berth 在 `~/.claude/.berth/hooks-state.json` 保存恢复点, 用于页面继续展示 disabled hook, 并支持恢复。
- 每次写 Claude settings 前创建时间戳整文件备份, 写入使用同目录临时文件再 rename。
- Codex 现有 `[hooks.state]` 切换能力保持不变。
- 初版只支持 Claude Code user scope; project/local/enterprise 继续只读。

同时把 Hooks 页面从“写死 Claude/Codex 判断”收窄到统一的 hook capability 模型。短期只覆盖 Claude Code 和 Codex, 但接口设计要沿着 `Agent Capability Plugin` 方向走, 以后可以接 Hermes、PI 或其他 Agent。

## 不做

- 不给 Claude hook object 增加 `enabled: false`。官方没有该字段, 可能造成 UI 和实际执行不一致。
- 不把 event key、matcher group 或 command 改名为 `_disabled_*`。这会把非官方结构留在 Claude settings 中。
- 不把 command 改成 no-op。恢复成本高, 也会破坏用户原始命令。
- 不写 project `.claude/settings.json` 或 `.claude/settings.local.json`。这类文件可能属于仓库或本地项目状态, 需要单独确认和 diff 视图。

## 数据模型

### Unified hook asset

Claude Code 和 Codex 的 hook 配置格式不同:

- Claude Code: hooks 定义在 JSON settings 中, 一个 event 下有 matcher group, matcher group 下有 hook 子项。
- Codex: hooks 可来自 `config.toml` 或 `hooks.json`; 单 hook 状态由用户配置里的 `[hooks.state]` 管理, 官方 `/hooks` 也支持禁用 non-managed hook。

UI 不应直接理解这些格式。parser 应把两者都映射成统一的 `HookAssetMeta`:

```ts
interface HookAssetMeta {
  provider: 'claude-code' | 'codex'
  event: string
  matcher?: string
  hookHash: string
  scenarioHash: string
  sourcePath: string
  stateSourcePath?: string
  enabled: boolean
  effectiveEnabled?: boolean
  canToggleHook: boolean
  toggleStrategy: 'native-state' | 'soft-remove' | 'read-only'
  managed?: boolean
  occurrenceCount?: number
  equivalentSources?: Array<{
    agentId: string
    sourcePath: string
    scope: string
    managed?: boolean
  }>
}
```

字段语义:

- `enabled`: 当前 source 中这条 hook 是否注册。Claude soft disable 后为 `false`; Codex `[hooks.state]` 禁用后也为 `false`。
- `effectiveEnabled`: 用户是否仍可能遇到同类 hook。若当前 source 禁用了, 但其他 source 仍有同 `event + matcher + hookHash`, 则为 `true`。
- `toggleStrategy`:
  - `native-state`: Agent 有原生或官方配置状态, 例如 Codex `[hooks.state]`。
  - `soft-remove`: Agent 没有单 hook 状态, Berth 通过删除配置子项并保存恢复点实现, 例如 Claude Code user settings。
  - `read-only`: 受管理、项目级、未知格式或安全原因导致不可写。

Hooks 页面只依赖这个统一 meta 渲染行状态、确认文案和可用动作。

### Hook identity

Claude active hook 的身份分两层:

```ts
type ClaudeHookKey = `claude-code:${string}:${string}:${string}`
```

字段含义:

- `event`: Claude hook event, 例如 `SessionStart`、`PreToolUse`、`PostToolUse`、`Stop`。
- `scenarioHash`: 对 `{ event, mode, matcher }` 做 canonical JSON 后的 hash。它表示这条 hook 所在场景, 不是具体 hook 身份。
- `hookHash`: 只对 hook 子项本身做 canonical JSON 后的 hash。

示例 hook 子项:

```json
{
  "type": "command",
  "command": "D:/Code/esp-harness/tools/esp-harness/.venv/Scripts/python.exe D:/Code/esp32-agent-dashboard/tools/hook_dispatch.py session_start"
}
```

这条 hook 的 `hookHash` 只来自上面这个对象, 不包含 `event`、`matcher`、`handlerIndex` 或 `hookIndex`。

规则:

- `handlerIndex` / `hookIndex` 只能作为当前扫描到的位置, 用于定位文本 patch 范围或 UI 调试, 不能作为身份或恢复依据。
- 同一 scenario 下出现多个相同 `hookHash`, UI 合并成一条 hook 资产, `meta.occurrenceCount` 记录数量。
- 同一 `hookHash` 出现在不同 event 或 matcher 下, 视为不同场景里的同类 hook, 不互相覆盖。

Codex 也使用同一套身份:

- `hookHash` 只算 Codex hook 子项本身, 例如 command、commandWindows、type、async 等会影响行为的字段。
- `scenarioHash` 只算 event 和 matcher。
- Codex 当前已有 `hookKey` 用于 `[hooks.state]`; 后续要改成由 `scenarioHash + hookHash` 推导, 或至少在 meta 里同时保留旧 state key 与新统一 identity。
- 如果 Codex 同一 scenario 下出现重复 `hookHash`, UI 也合并显示 `occurrenceCount`。禁用时写一条统一 state, 不按数组 index 拆多条。

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
  occurrences: Array<{ handlerIndex: number; hookIndex: number }>
  occurrenceCount: number
  hookKey: string
  scenarioHash: string
  hookHash: string
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
  matcher?: string
  scenarioHash: string
  containerTemplate?: Record<string, unknown>
  hook: Record<string, unknown>
  hookHash: string
  removedCount: number
  disabledAt: string
}
```

保存 `containerTemplate` 是为了在目标场景不存在时重建 matcher group; 它不能参与 hook 身份判断。保存 `hook` 是为了精确恢复被移除的子项。`removedCount` 用于还原重复子项的数量, 但恢复时如果当前场景里已经存在同一 `hookHash`, 视为已启用, 不再插入重复项。

## 局部冲突模型

这个功能不能把整份 `settings.json` 当作版本控制单位。Claude settings 是高频修改文件, 用户、Claude Code 和其他本地工具都可能修改无关段落。Berth 的冲突判断只围绕“目标 hook”和“目标 hook 所在容器”:

- hook 身份: `hookHash`, 只由 hook 子项本身的 canonical JSON 计算。
- 场景选择器: `event + mode + matcher`。它只用于限定扫描范围和恢复插入位置。
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
   - 禁用只删除目标 scenario 下 `hookHash` 相同的 hook 子项。
   - 恢复只在目标 scenario 下插入 sidecar 里的 hook 子项。
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
- `scenarioHash`
- `hookHash`
- `sourcePath`

处理规则:

1. 按 `hookKey` 找到 event 和 scenario。
2. 扫描该 scenario 下所有 hook 子项, 对每个子项计算 `hookHash`。
3. 删除所有 hash 等于目标 `hookHash` 的子项。
4. 找到零条:
   - 若 sidecar 已有该 scenario + hookHash 的 disabled entry, 返回 no-op。
   - 否则返回 stale conflict, 提示刷新后重试。
5. 找到一条或多条:
   - 全部删除, sidecar 记录 `removedCount`。
   - 这表示行级禁用的单位是“该场景下这类 hook 子项”, 不是数组中的某一个 index。

这个规则允许用户或其他软件修改无关段落, 也允许同一 event 下新增其他 hook。只有目标 scenario 不存在、目标 hook 子项已经被改成另一个 hash, 或文件结构无法解析时才冲突。

### 恢复时的局部判断

恢复操作以 sidecar entry 为准, 但必须合并到当前 settings:

1. 先定位 sidecar 里的 event 和 scenario。
2. 扫描该 scenario 下所有 hook 子项, 对每个子项计算 `hookHash`。
3. 当前 scenario 下已有一条或多条同一 `hookHash`:
   - 视为用户已经手动恢复。
   - 不再插入重复 hook。
   - 清理 sidecar entry。
4. 当前 scenario 存在但没有同一 `hookHash`:
   - nested mode 插入到这个 matcher group 的 `hooks` 数组。
   - 插入数量为 `removedCount`, 最少 1 条。
   - 保留当前 matcher group 的其他字段, 不用 sidecar 覆盖。
5. 当前 scenario 不存在:
   - 用 `containerTemplate` 重建 matcher group。
   - 只插入要恢复的 hook, 不覆盖其他当前内容。
   - 插入数量为 `removedCount`, 最少 1 条。

这里的“同名段落”按 Claude Hook 结构解释为 `event + matcher group`。真正表示“同一条 hook”的依据只能是子项的 `hookHash`。如果目标 scenario 中已经有重复的同 hash 子项, 状态就是 enabled; enable 操作只清理恢复点, 不再额外追加。

### 风险与进一步优化

1. 文本被整文件重写
   - 风险: 当前仓库对 Claude settings 使用 `JSON.parse` / `JSON.stringify`。如果实现沿用这个方式, 即使只删除一个 hook, 文件缩进、换行和 key 顺序也可能被重写。
   - 影响: 语义正确, 但用户手动维护的格式会丢失, 外部工具也更容易看到大面积 diff。
   - 规避: 实现前引入文本级 JSON patch。优先用 JSON AST/range parser 定位目标 scenario 下所有同 `hookHash` 子项的文本范围, 只删除或插入目标数组元素。删除多个子项时按文本位置倒序处理, 并正确处理前后逗号。解析失败时不写。整文件 `JSON.stringify` 只作为测试夹具或明确的 fallback, 不作为默认写入路径。
2. 目标 hook 被用户改了
   - 风险: 用户在页面扫描后改了 command 或 type。此时原 `hookHash` 找不到。
   - 影响: Berth 不知道用户想禁用“旧 hook”还是“改过后的新 hook”。
   - 规避: 返回 stale conflict, 提示刷新后重试。不按相似 command 或同名 matcher 猜测。
3. 同一 hook 被复制成多份
   - 风险: 当前 scenario 里出现多条相同 `hookHash`。
   - 影响: 如果只删一条, 用户看到 disabled 但同一 hook 仍会运行。
   - 规避: 行级禁用删除该 scenario 下全部同 hash 子项, sidecar 记录 `removedCount`。恢复时如果已有任意同 hash 子项, 视为 enabled。
4. 同一 event + matcher group 出现多份
   - 风险: 当前 settings 里有多个相同 scenario 容器。
   - 影响: 恢复插入到哪一个容器会影响顺序。
   - 规避: 恢复前先扫描所有相同 scenario 容器; 任意容器已有同 hash 子项就视为 enabled。若都没有, 插入第一个现有 scenario 容器; 没有 scenario 时用 `containerTemplate` 创建。
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
   - 规避: 扫描时按 `event + matcher + hookHash` 汇总跨来源 duplicate。行内提示“其他来源仍存在同一 hook”, 禁用操作只声明影响当前 user source。
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

1. 必做: 文本级最小 JSON patch、hook 子项 hash 匹配、scenario 扫描、per-file mutex、写前复读重算、sidecar schema 校验、跨来源 duplicate 提示。
2. 可后续: 备份保留策略、重复 hook 手动选择 UI、从整文件备份恢复单条 hook。

### 写入顺序

禁用优先保证可恢复:

1. 从当前 settings 构造 sidecar entry。
2. 先写 sidecar。
3. 再写 settings 删除 active hook。
4. 若 settings 写失败, sidecar 可能残留; parser 会因为 active 中仍有同 scenario + hookHash hook 而隐藏 disabled 副本。

恢复也优先保证恢复点不丢:

1. 先写 settings 插回 hook。
2. 再清理 sidecar。
3. 若 sidecar 清理失败, parser 会因为 active 中已有同 scenario + hookHash hook 而隐藏 disabled 副本, 下次操作可继续清理。

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

初版不扩展 `scope` union, 避免误让 UI 发送 project/local 写入请求。Claude Code 的目标身份从 `hookKey` 内的 `scenarioHash` 和 `hookHash` 解析, 不要求 UI 传整文件 hash。

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
   - nested mode: 删除目标 scenario 下所有同 `hookHash` 的 `handler.hooks[]` 子项; 若该数组清空, 删除整个 handler。
   - direct mode: 删除目标 event 下所有同 `hookHash` 的 direct handler。
   - 若 event 数组清空, 删除 `settings.hooks[event]`。
8. 先写时间戳备份:
   - `settings.json.berth-backup-YYYYMMDDTHHMMSSmmmZ`
9. 写 settings:
   - `settings.json.berth-tmp-${pid}-${nonce}`
   - `rename(tmp, settings.json)`
10. 如果写前复读发现文件又变了, 重新读取并重算禁用 transform, 最多 3 次。
11. 退出 mutex。

如果 sidecar 已有同一 scenario + `hookHash` 的 disabled entry, 禁用应返回 no-op 成功, 不重复写入。

### 恢复流程

`setClaudeHookEnabled(request.enabled === true)`:

1. 校验 user scope、sourcePath、hookKey。
2. 进入 settings 文件 mutex。
3. 读取 sidecar entry; 不存在则检查 active settings:
   - 若目标 scenario 中已有同一 `hookHash`, 返回 no-op 成功。
   - 否则返回 “找不到恢复点”。
4. 读取 settings JSON。
5. 若目标 scenario 中已有同一 `hookHash`:
   - 清理 sidecar entry。
   - 返回成功。
6. 按局部冲突模型恢复:
   - nested mode:
     - 若目标 scenario 存在, 插入到该 scenario 的 `hooks` 数组末尾。
     - 若目标 scenario 不存在, 用 `containerTemplate` 创建 handler, 其中 `hooks` 只包含要恢复的 hook 子项。
   - direct mode:
     - 若目标 event 中没有同 `hookHash` direct handler, 将保存的 hook 作为 handler 追加到 event 数组末尾。
7. 写 settings 备份 + temp rename。
8. 如果写前复读发现文件又变了, 重新读取并重算恢复 transform, 最多 3 次。
9. 清理 sidecar entry, temp rename 写 sidecar。
10. 退出 mutex。

## Parser / Scanner 设计

`src/main/adapters/claude-code/parsers.ts#parseHooks()`:

- active hooks:
  - 为每条 Claude hook 增加 `hookKey`、`scenarioHash`、`hookHash`、`enabled: true`。
  - 同一 scenario 下相同 `hookHash` 的子项合并成一条 asset, 并写入 `occurrenceCount`。
  - 只有 `scope === 'user'` 且 source 是 `~/.claude/settings.json` 时 `canToggleHook: true`。
- disabled hooks:
  - user settings 解析时读取 `~/.claude/.berth/hooks-state.json`。
  - 将 sidecar entry 转成 `CapabilityAsset`。
  - `path` 使用原 `sourcePath`, `meta.enabled = false`, `meta.disabledByBerth = true`。
  - 如果 active settings 中已经有同 scenario + hookHash hook, 不展示 disabled 副本, 避免同一 hook 出现 active / disabled 两行。
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

Hooks 页面需要把状态分成两行信息:

- `注册状态`: 当前 source 是否还有这条 hook。对应 `enabled`。
- `实际影响`: 是否还有其他 source 提供同一 `event + matcher + hookHash`。对应 `effectiveEnabled` 和 `equivalentSources`。

显示建议:

- 行主状态 tag 展示 `启用` / `已禁用` / `只读`。
- 若 `enabled === false` 但 `effectiveEnabled === true`, 在状态旁显示小 tag: `其他来源仍启用`。
- hover/详情中列出其他来源路径、scope、managed 状态。
- 操作确认文案必须说明“只影响当前 source”, 不暗示全局禁用。

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

### Codex 兼容策略

Codex 不需要 Claude 的 sidecar soft remove, 但需要进入同一套 UI 与身份模型:

- parser 为 Codex hook 生成 `scenarioHash`、`hookHash`、`occurrenceCount`。
- `toggleStrategy: 'native-state'`。
- `stateSourcePath` 指向用户 `config.toml`。
- `hookKey` 仍用于写 `[hooks.state]`, 但应从稳定 identity 生成, 避免 index 变化后状态丢失。
- managed hook 继续 `read-only`, 与官方 “managed hooks can’t be disabled from the user hook browser” 行为保持一致。
- 若 Codex hook 同时来自 `hooks.json` 和 inline `[hooks]`, UI 按 source 分行, 但用 `equivalentSources` 提醒同类 hook 仍存在于其他 source。

这样 Claude 和 Codex 的差异只留在 adapter/action 层:

- Claude: `toggleHook(false)` -> soft remove + sidecar。
- Claude: `toggleHook(true)` -> sidecar restore。
- Codex: `toggleHook(enabled)` -> 写 `[hooks.state]`。
- UI: 只看 `toggleStrategy`、`enabled`、`effectiveEnabled`、`equivalentSources`。

## Agent Capability Plugin

仓库现在已经有 `AgentAdapter`, 但它主要负责 detect / scan / relation。hook 管理仍散在 parser、`hooks-manager.ts` 和 renderer 的 `agentId` 判断里。产品概念应改为 `Agent Capability Plugin`:

- 对用户: 叫 Plugin。Claude Code 和 Codex 是内置插件。
- 对代码: 可以复用现有 `AgentAdapter` 的扫描能力, 但新增 capability action 描述和操作入口。
- 对后续扩展: Hermes / PI 这类 Agent 通过新增插件接入, 不再让页面和 IPC 到处写 `if agentId`。

GH-11 只实现 hooks 这一个切片, 不实现完整插件市场、插件下载和版本管理。完整插件系统记录到 `docs/issues/2026-06-01-FEATURE-agent-capability-plugin-system.md`。

内部接口先命名为 `AgentCapabilityPlugin`:

```ts
interface AgentCapabilityPlugin {
  id: string
  displayName: string
  version: string
  builtin: boolean
  supportedAgentVersions?: string
  scan(): Promise<{ assets: Asset[]; errors: ScanError[] }>
  getHookStatus?(scope: AssetScope): HooksEnablementStatus
  setHooksEnabled?(request: SetHooksEnabledRequest): SetHooksEnabledResult
  getHookAction?(asset: Asset): HookActionDescriptor
  setHookEnabled?(request: SetHookEnabledRequest): SetHookEnabledResult
  describeHookIdentity?(asset: Asset): HookIdentity
}

interface HookActionDescriptor {
  strategy: 'native-state' | 'soft-remove' | 'read-only'
  canToggle: boolean
  reasonKey?: string
  confirmKey?: string
  stateSourcePath?: string
}

interface HookIdentity {
  event: string
  matcher?: string
  hookHash: string
  scenarioHash: string
}
```

迁移顺序:

1. 把现有 `ClaudeCodeAdapter` 和 `CodexAdapter` 包装成内置 `AgentCapabilityPlugin`。
2. `hooks-manager.ts` 不再按 `agentId` 写死分支, 改为查 plugin registry。
3. renderer 不再判断 `hook.agentId === 'codex'`, 改为消费 `HookActionDescriptor`。
4. health check、source coverage 仍可暂时保留原实现, 不在本任务中迁移。

### 全应用范围

完整 `Agent Capability Plugin` 应覆盖整个应用, 不只 hooks:

- 来源发现: 用户级、项目级、会话级、managed 配置在哪里。
- 资产解析: instructions、skills、subagents、MCP、hooks、sessions、usage、statusline、permissions 等。
- 操作能力: 打开来源、启停 hooks、写配置、清理恢复点、刷新缓存。
- 健康检查: 插件提供检查项、证据、修复建议。
- UI 描述: 名称、图标、来源分组、能力可用性、确认文案。
- 版本兼容: 插件版本、目标 Agent 版本、配置 schema 版本。

设置页应新增 `Agent Capability Plugins` 入口:

- 展示内置插件: Claude Code、Codex。
- 展示插件版本、目标 Agent、已扫描来源、启用状态。
- 后续支持安装第三方插件、更新、禁用、查看权限。
- 写操作权限要单独列出, 例如 “可修改 `~/.claude/settings.json`”。

为什么不在 GH-11 一次实现外部 plugin:

- hook 写入涉及本地配置文件修改, 需要文件路径校验、备份、并发控制和 UI 确认。外部 plugin 一旦能执行写操作, 权限模型会变复杂。
- Hermes / PI 的官方配置格式还需要逐个确认, 现在先稳定内置 Plugin 接口更现实。
- 先做内置 registry, 后续再把 manifest 拆成可下载插件:

```ts
interface AgentPluginManifest {
  id: string
  displayName: string
  version: string
  agentCompatibility: {
    name: string
    versionRange?: string
  }
  docs: string[]
  sources: SourceDescriptor[]
  assetTypes: AssetTypeDescriptor[]
  actions: ActionDescriptor[]
  permissions: Array<{
    kind: 'read' | 'write' | 'execute'
    paths?: string[]
    reason: string
  }>
}
```

后续接入新 Agent 的理想流程:

1. 输入 Agent 源码和官方文档。
2. 生成 `AgentPluginManifest` 草案。
3. 生成 source resolver, 说明用户级、项目级、managed 配置在哪里。
4. 生成 parser, 输出统一 `Asset` 和对应 meta。
5. 如需写入, 生成 capability action, 并提供冲突处理与备份策略。
6. 生成目标测试和 UI fixture。
7. 人工 review 权限、写文件路径和危险操作后才允许启用写操作。

这让 Hermes / PI 的接入点集中在 Plugin, 而不是分散到页面、IPC、health check 和 parser 的多处 `if agentId`。

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
  - active 已有同 scenario + hookHash 时恢复为 no-op 并清理 sidecar。
  - stale key、source mismatch、managed、非 user scope 返回错误。
  - Codex `hooks.state` 现有测试保持通过。
- `tests/unit/claude-scanner.test.ts` 或 parser 相关测试
  - active user hook 带 `hookKey`、`scenarioHash`、`hookHash`、`enabled`、`canToggleHook`。
  - sidecar disabled hook 会被展示。
  - active 中已有同 scenario + hookHash 时不展示 sidecar duplicate。
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
