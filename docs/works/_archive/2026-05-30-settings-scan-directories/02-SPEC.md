# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

新增只读扫描来源契约, 由主进程生成, renderer 不自行拼本地路径。

```ts
export interface AgentScanSourceGroup {
  agentId: string
  agentName: string
  installed: boolean
  roots: ScanRoot[]
}
```

- `ScanRoot` 复用 `src/shared/types/asset.ts` 现有类型, 含 `path / scope / description`。
- `ScanRoot` 追加可选展示元数据:
  - `summary`: 说明该入口实际覆盖的内容, 例如 `Instructions, skills, hooks, plugins, sessions, usage data`。
  - `categories`: 使用现有 `AssetCategory[]` 表示入口可能产出的资产大类, 用于 UI 汇总, 不枚举每个文件类型。
- 新增 IPC: `assets:scan-sources -> AgentScanSourceGroup[]`。
- preload 暴露 `window.api.assets.scanSources()`。
- `PlatformInfo.claudeDir` 可暂时保留兼容, 但设置页不再依赖它渲染扫描来源。
- `CodexAdapter.scanRoots()` 调整为返回实际读取的 `~/.codex/sessions`。如果 `~/.codex` 存在但 `sessions` 不存在, `installed=true` 且 roots 为空。

## 模块结构 / 组件拆分

遵守 docs/ARCHITECTURE.md 的边界与约定。

### 主进程

1. `AssetScanner`
   - 新增 `getScanSourceGroups()`。
   - 对每个 adapter 调 `detect()`; detect 失败时返回 `installed=false`, roots 为空, 并用 adapter displayName 保持 UI 可见。
   - 该方法只读文件系统元信息, 不触发全量资产扫描。

2. `CodexAdapter`
   - `scanRoots()` 返回 `~/.codex/sessions` 作为 state/session 来源。
   - `detect()` 仍以 `~/.codex` 是否存在判断 Codex 是否存在。

3. `AssetWatcher`
   - 增加 `~/.codex/sessions` 到监听路径。
   - 只在路径存在时监听, 避免 chokidar 对不存在路径产生噪声。
   - 保持 watcher 仍是全局启动项, 设置页本轮不提供启停控制。

4. `runHealthChecks()`
   - 改为 agent-aware:
     - `~/.claude` 和 `~/.codex` 都不存在时, 返回 “No supported agent data found” 级别 warning。
     - 只有 Codex 时, 不返回 `no-claude-dir` error。
     - Claude 存在时, 继续保留 Claude-specific checks。

### 渲染层

1. 新增 hook `useScanSources()`。
2. 设置页把 “Scan Directories / 扫描目录” 改为 “Local Sources / 本地来源”。
3. 每个 agent group 展示:
   - agent 名称: Claude Code / Codex。
   - 状态: `Detected / Not found`。
   - 默认摘要: root 数量 + 覆盖资产大类。
   - 展开明细: 按 user/project scope 分组, 显示每个 root 的 description / summary / path。
   - open button 只在对应 root 存在时显示。
4. 取消“扫描目录可配置”的暗示, 不提供添加目录。
5. `File Watching` toggle 当前不接主进程, 本轮改为说明性禁用行: “Watching is managed automatically for detected sources”。不再写 localStorage。
6. `Advanced Mode` 仍保留, 因为它是展示偏好; 本轮不扩大其行为。

### UI 取舍

这是 product UI, 设计服务于任务本身。布局保持克制、密集、可扫读:

- 不做解释型大段文案。
- 不使用嵌套卡片; settings 原有 section card 内放列表行即可。
- 使用 `FolderOpen`、`ExternalLink`、`Check` 这类现有 lucide 图标。
- 不新增颜色体系, 只使用现有 semantic token。

## 测试策略

1. 主进程单元测试:
   - `AssetScanner.getScanSourceGroups()` 聚合 Claude 和 Codex detect 结果。
   - adapter detect 失败时不会破坏其他 adapter。
2. Codex adapter 单元测试:
   - `scanRoots()` 返回 `~/.codex/sessions`, 而不是只返回 `~/.codex`。
3. renderer 测试:
   - `SettingsContent` 在 both 状态下显示 Claude Code 和 Codex 来源。
   - Codex-only 状态不显示 Claude-only 错误文案。
   - 不存在 root 不显示 “Show in Explorer” 可点击按钮。
4. 目标门禁:
   - `pnpm test -- tests/unit/engine-scanner.test.ts tests/unit/codex-session-parser.test.ts tests/renderer/settings-sources.test.tsx`
   - `pnpm typecheck`
   - `pnpm harness:check`

## 验收标准映射

| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| `AgentScanSourceGroup` + `assets:scan-sources` | 1, 2, 5, 9 |
| Codex `scanRoots()` 指向 sessions | 4 |
| Settings “Local Sources” 只读展示 | 1, 2, 3, 6 |
| watcher 纳入 Codex sessions | 7 |
| agent-aware health checks | 8 |
| renderer / unit 测试 | 9, 10 |
