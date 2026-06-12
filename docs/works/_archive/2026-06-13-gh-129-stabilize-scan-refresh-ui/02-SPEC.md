# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号。

## 数据契约

### renderer asset store

- committed snapshot: `assetSnapshotId != null && assetSnapshotId !== "initial"`。
- scanning background update: `AssetRuntimeStatus.state === "scanning"` 且 store 已有 committed snapshot。
- `applyAssetProgress(payload)`:
  - 始终更新 `assetRuntimeStatus`, 让侧栏/状态区能反映后台扫描。
  - 若 `payload.partial` 缺失, 不改可见资产。
  - 若是 scanning background update, 不改 `assets` / `stats` / `projectCandidates` / `assetErrors` / `assetSnapshotId`; 保持当前页面 stale 数据。
  - 若不是 scanning background update, 沿用现有 partial 合并逻辑, 保证冷启动 partial 与 `applyFileChange()` 增量更新继续生效。
- `setAssetSnapshot(snapshot)`:
  - 若读到 scanning snapshot 且已有 committed snapshot, 只更新 `assetRuntimeStatus`, 不替换可见数据。
  - final snapshot 仍按 `snapshot.assets` / `snapshot.stats` / `snapshot.projectCandidates` / `snapshot.errors` 替换, 并更新 `assetSnapshotId`。

对应 AC-1 / AC-2 / AC-3。

### watcher fallback refresh

- `watch-wiring` 对 `deriveAssetsForPath(...) === null` 的事件不再直接调用 `refresh({ reason: "watcher" })`, 优先调用 `scheduleRefresh({ reason: "watcher" })`。
- `AgentAssetRuntime.scheduleRefresh()` 负责合并高频 watcher fallback:
  - 默认 debounce: 1s。
  - 默认 watcher full refresh 最小间隔: 30s。
  - 同一等待窗口内的多次事件只保留一个后台 full refresh。
  - 已经发生过 watcher full refresh 后, 下一次 scheduled watcher refresh 至少等满最小间隔。
  - `setProjectDir()` / scanner 代际切换清理等待中的 scheduled refresh。
- 手动刷新、legacy scan-all、冷启动刷新不走这个最小间隔, 保持用户显式操作即时。

对应 AC-4 / AC-5 / AC-6。

## 任务分类与 debt
- type / maintenance.subtype: `bug`, 非 maintenance。
- source.kind / refs: `user-request`, GitHub Issue #129。
- debt.estimate: 保持 `cross-process/high/net=4`。Explore 后确认影响跨 watcher、runtime、renderer store 与真实时间行为, 初估成立。
- debt.final 预期: 若只修默认行为和测试, 预期净值不高于 2; 具体在 verify 后回填。
- revisions: 暂不调整。
- Project 字段同步: 已加入 Project 6, 状态 `In Progress`。

## 模块结构 / 组件拆分
遵守 docs/ARCHITECTURE.md 的边界与约定。

- `packages/berth-scan-engine/src/engine/assets/watch-wiring.ts`
  - 只负责把 unsupported watcher event 转为 scheduled refresh 请求。
  - 不引入 renderer 概念。
- `packages/berth-scan-engine/src/engine/assets/runtime.ts`
  - 增加 runtime 内部 scheduled refresh 状态、默认节流常量与测试注入时钟。
  - 不改变 `refresh()` 的公开语义。
- `src/renderer/src/stores/app.ts`
  - 资产写入仍只通过 `setAssetSnapshot` / `applyAssetProgress`。
  - 新增小型守卫函数, 判断 background scanning 时是否保持可见数据。
- 不新增设置页 UI。
  - 当前缺少扫描周期设置入口是事实; 本轮先降低默认噪声和成本。
  - 如果后续需要可配置, 应另开 issue 设计 watcher enable/refresh cadence 与默认值。

## 界面质量与交互验收
前端或 UI 相关任务填写; 非 UI 任务写“不适用”。

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 不改页面布局; 内容区继续显示旧列表/图表, 状态区可显示后台扫描。 | Electron 实例停留在列表/图表页 30s, 内容不闪空、不短暂变成扫描子集。 |
| 组件选择 / 设计系统一致性 | 不新增组件; 保持现有 HeroUI / store 订阅方式。 | 代码检查: 无新增页面组件和样式分支。 |
| 交互反馈 / 状态切换 | 后台扫描只影响状态文案; 用户正在看的资产列表保持 stale。 | CDP 观察 `window.api.assets.status()` 与页面文本, 状态可变但内容行数/关键行稳定。 |
| loading / empty / error / disabled / focus | 冷启动无快照时 partial 仍可填首屏; 有快照时不回 empty/loading。 | renderer store 单测覆盖有无 committed snapshot 两种分支。 |
| 响应式 / 可访问性 / 键盘可达 | 不改 DOM 结构与交互目标。 | 不需要新增自动化; 通过未改动组件结构说明豁免。 |
| 文案 / i18n / 数字和路径格式 | 不新增文案; “索引中”仍可作为真实后台状态, 但频率降低。 | 真实观察记录扫描状态不再高频反复出现。 |

## 测试策略

每个实现项必须有测试证据或明确例外理由。

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| committed snapshot 下 scanning partial 不替换可见 assets/stats | renderer store unit | `tests/renderer/app-store.test.ts` | `pnpm vitest run tests/renderer/app-store.test.ts` |  |
| 冷启动 initial/no snapshot 下 partial 仍能填首屏 | renderer store unit | `tests/renderer/app-store.test.ts` | `pnpm vitest run tests/renderer/app-store.test.ts` |  |
| final snapshot 与 ready 状态增量 partial 仍能更新 UI | renderer store unit | `tests/renderer/app-store.test.ts` | `pnpm vitest run tests/renderer/app-store.test.ts` |  |
| unsupported watcher event 优先调用 scheduled refresh, 老 runtime fallback 仍调用 refresh | unit | `tests/unit/watch-wiring.test.ts` | `pnpm vitest run tests/unit/watch-wiring.test.ts` |  |
| `AgentAssetRuntime.scheduleRefresh()` 合并事件并应用最小间隔 | unit fake timers | `tests/unit/agent-asset-runtime.test.ts` | `pnpm vitest run tests/unit/agent-asset-runtime.test.ts` |  |
| harness 任务文档结构合规 | harness | `docs/works/2026-06-13-gh-129-stabilize-scan-refresh-ui` | `pnpm harness:check --work docs/works/2026-06-13-gh-129-stabilize-scan-refresh-ui` |  |
| 真机停留页面时内容稳定 | manual/CDP | Electron dev agent | `pnpm dev:agent start ...` + CDP 观察脚本 | 时序闪烁需要真实 Electron 运行时与 watcher/progress 事件验证, 单测只能覆盖 store 与调度规则。 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| renderer asset store stale 保持 | AC-1, AC-2, AC-3 |
| watcher fallback scheduled refresh | AC-4, AC-5 |
| 不新增设置 UI, 说明当前配置事实 | AC-6 |
| Electron/CDP 时序观察 | AC-5 与界面质量验收 |
