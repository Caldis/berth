# Explore — 扫描刷新 UI 稳定性

## 现状理解

用户看到的“索引中”来自 `assetRuntimeStatus.state === 'scanning'`。真实链路是:

1. `src/main/index.ts` 初始化 `AgentAssetRuntime`, 启动 `AssetWatcher`, 并把 `assets:progress` / `assets:changed` 广播给所有窗口。
2. `packages/berth-scan-engine/src/engine/watcher.ts` 监听 Claude/Codex 来源目录, 包括 Codex 的 `sessions` 与 `archived_sessions`。
3. `packages/berth-scan-engine/src/engine/assets/watch-wiring.ts` 对支持单文件派生的配置文件走 `applyFileChange`; 对 session jsonl 这类不支持单文件派生的文件, fallback 到 `runtime.refresh({ reason: 'watcher' })`。
4. `AgentAssetRuntime.refresh()` 进入 `scanning`, worker 扫描时通过 `onPartial` 推送扫描中的累计资产。
5. `src/renderer/src/stores/app.ts` 的 `applyAssetProgress()` 会把 partial assets 写入全局 `assets`; 页面使用 `useAppStore((s) => s.assets)` 的列表会随扫描中间态变化。

## 根因

### 1. 扫描频繁

现在没有固定的 4-5 秒轮询设计, 也没有用户可配置的扫描周期入口。4-5 秒现象更像是高频文件监听触发:

- Codex 会在活跃会话期间持续写 session/rollout JSONL。
- watcher 监听了 Codex `sessions` / `archived_sessions`。
- session jsonl 目前不支持单文件增量派生, 所以每次 change 都会触发一次完整 runtime refresh。
- `ScanCoordinator` 只做 in-flight 去重, 没有对 watcher fallback 做延迟、合并或最小间隔控制。

这会带来两个问题: 用户能反复看到“索引中”, 同时 worker/解析/SQLite 持久化有不必要开销。

### 2. UI 闪烁

项目已经有 SWR 方向的设计: 冷启动可先显示 SQLite 持久快照, 页面 hook 如 `useSessions()` / `useUsageSummary()` 会保留旧数据再刷新。但全局资产 store 的 partial 处理违反了这个原则:

- 后台全量扫描有旧快照时, partial 是“不完整中间态”, 不应替换当前可见资产。
- 当前 `applyAssetProgress()` 对 scanning partial 直接写 `assets` / `stats`, 因此页面列表会短暂变成扫描中子集, 等最终 snapshot 到达后又变回来。
- `setAssetSnapshot()` 也可能通过 `assets:changed -> syncSnapshot()` 读到 scanning snapshot, 需要同样保持可见资产稳定。

已有 `foldKeepingShallow()` 只保住了 shallow 资产, 不能保护普通 session / skill / hook / command 等可见行。

## 设置入口核对

- 设置页只展示“文件监听”说明文案, 未接入主进程 watcher 开关或扫描频率设置。
- i18n 中的 `refreshInterval` 是 status line 配置资产字段, 不是 Berth 自身扫描周期设置。
- 本轮不新增设置 UI; 先修正默认行为: 高频 watcher fallback 合并/限频, UI 对后台 partial 保持 stale。

## 影响面

- 主进程 / engine:
  - `AgentAssetRuntime`
  - `watch-wiring`
  - `ScanCoordinator` 相关测试
- renderer:
  - `stores/app.ts`
  - `useAssetRuntime()` 订阅进来的 `assets:progress` 行为
- 受影响页面:
  - 直接读 `useAppStore().assets`: 总览、约定、能力、侧栏扫描状态等。
  - 读 selector IPC/SWR hook 的页面: 会话、用量、记忆等应继续保留旧数据, 但扫描状态不应造成列表清空或重建。

## Debt 校准

初始 `cross-process/high` 仍准确。根因跨 watcher、runtime、renderer store 与真实时间行为; 需要 unit + renderer hook + 真机时序验收。

## 验收标准

AC-1. 后台全量扫描已有 committed snapshot 时, scanning partial 不替换当前可见 `assets` / `stats` / `projectCandidates`; 页面继续显示旧数据直到最终 snapshot 到达。

AC-2. 初次启动且没有旧快照时, partial 仍允许填充首屏, 不退回全空等待最终结果。

AC-3. `applyFileChange()` 产生的增量 partial 仍能更新 UI, 新增/删除单文件资产不被误挡。

AC-4. watcher fallback full refresh 不再对每个高频 session `change` 立即触发; 多个事件会合并, 且 full refresh 有最小间隔。

AC-5. “索引中”不再在活跃 Codex 会话写入时每 4-5 秒反复出现; 同时新增/删除文件仍能在合理时间内反映。

AC-6. 设置入口现状被说明清楚: 目前没有用户可调扫描周期; 本轮不新增 UI 设置。

## 界面质量与交互验收

- 观察 30 秒以上, 页面停留在列表/图表页时内容不应闪空、跳动或变成扫描中子集。
- 扫描状态可出现, 但不应造成内容区重排或列表重建。
- 侧栏扫描状态可以反映后台任务, 但页面主要内容应按 stale 数据保持稳定。
- 验收要使用真实 Electron 实例和 CDP 时序采集, 不能只看单帧截图。

## 未决问题

无需要用户澄清的问题。实现上采用保守默认值, 不引入设置页面入口。
