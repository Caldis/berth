# 技术方案 (Design 产物)

范围 A (用户确认): 只修直接根因 —— `ensureReady` 在 stale 状态阻塞全量 scan, 恢复 SWR (秒显旧快照 + 后台刷新)。根因 B (scan 成本) 与两个关联 issue (helper exit / watcher 全量重扫) **不在本次**, 已记 `docs/issues/`。

## 数据契约
不新增/不修改 IPC 通道, 不改 `AssetSnapshot`/`AssetRuntimeStatus` 类型。唯一变更是 `AgentAssetRuntime.ensureReady` 的**行为语义**。

ensureReady 决策表 (改后):
| status.state | snapshot | 行为 (改后) | 改前 |
|---|---|---|---|
| 任意 + `options.refresh===true` | — | `await refresh(wait:true)` 返回最新 | 同 (不变) |
| `stale` | `id !== 'initial'` (有持久/旧快照) | **立即 return snapshot + 后台 `void refresh(wait:false)`** | `await refresh(wait:true)` 阻塞 |
| `idle` / `stale` | `id === 'initial'` (真无数据) | `await refresh(wait:true)` 等首扫 | 同 |
| `scanning` | `id !== 'initial'` | **立即 return snapshot** (含 progress 流式数据) | `await refresh(wait:true)` 阻塞 |
| `scanning` | `id === 'initial'` (首扫中) | `await refresh(wait:true)` 等首扫 | 同 |
| `error` | `id === 'initial'` | `await refresh(wait:true)` 重试 | 同 |
| `ready` | — | return snapshot | 同 |

SWR 闭环 (既有, 不需新增代码): stale 立即返回 → 后台 refresh → `commitScan` 更新 snapshot + `webContents.send('assets:changed')` → renderer `useDashboardInsights`/`useSessions`/`useHealthChecks` 订阅的 `assets.onChanged` 触发 reload → fresh 数据替换。冷启动数据流: `restorePersistedSnapshot` (构造期已 seed stale 快照, GH-113) → 首个派生 IPC `ensureReady` 立即返回旧数据 → 后台首扫 → onChanged → reload。

## 任务分类与 debt
- type: bug / maintenance.subtype: 不适用
- source.kind: user-request / refs: GH-140
- debt.estimate: incurred 3 / repaid 1 / net 2 (explore 校准, design 无新变化, 不重复追加 revision)
- debt.final 预期: incurred 2 / repaid 1 / net 1 (实际改动比估算更小: engine 单方法 + 测试, 无新增模块/无 IPC 变更)
- Project 字段同步: archive 时经 `harness-projects done` 同步
- 总 debt pool=30 (notice, <40), 非 maintenance 任务可继续, 无需 override

## 模块结构 / 组件拆分
- 唯一改动文件: `packages/berth-scan-engine/src/engine/assets/runtime.ts` 的 `ensureReady` (engine 层, electron-free)。
- 不新增文件; 不改 IPC 通道 (四方对账不动); 不改 store 写路径; 不改 UI 组件; renderer 零改动 (SWR 闭环靠既有 `onChanged → reload`)。
- 边界合规: 改动在 engine 层单方法, 依赖方向不变 (main → engine)。
- 影响面 (ensureReady 全部调用方, 均"读当前快照派生"语义, SWR 改动对其正确): getDashboardInsights / getUsageSummary / listSessions / getHealthChecks / search / getScanSourceGroups / getProjectCandidates (runtime 内部); agent-plugins:list / sessions:get / sessions:events / sessions:event-payload / teams:list (handler 层显式)。stale 快照 envelope 保留 sources/projectCandidates, 故 scan-source/candidate 调用方也有数据。

## 界面质量与交互验收
冷启动首屏行为是核心验收 (非组件视觉改动):

| 项目 | 方案 | 验收方式 |
|---|---|---|
| loading / 首屏可见性 | 冷启动 dashboard widget 用 stale 数据立即渲染, 不再 loading 等全量 scan; 顶部扫描指示 (IndexHairline/sidebar) 后台继续 | CDP 真跑录屏: 首屏可见 < 1.5s 且扫描完成前数据已在 |
| 状态切换 (stale→fresh) | 后台 scan 完成经 onChanged 触发 reload, 数据原地更新 | 真跑观察: 刷新不整屏闪烁 (store fold 不变量 + insights 替换) |
| empty / error | 首次启动 (无快照) 仍走原首扫等待 + 渐进; scan 失败保留旧数据 (既有 SWR error 处理) | unit 覆盖 idle/initial/error 分支不退化 |
| 响应式 / 可访问性 | 无改动 | 不适用 |
| 文案 / i18n | 无改动 | 不适用 |

## 测试策略
| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化的理由 |
|---|---|---|---|---|
| ensureReady: stale+有快照 立即返回, 不 await scan, 后台触发 refresh | unit | tests/unit/agent-asset-runtime.test.ts | pnpm test agent-asset-runtime | — |
| ensureReady: idle/initial 仍 await 首扫 | unit | 同上 | 同上 | — |
| ensureReady: refresh:true 仍 await 最新 | unit | 同上 | 同上 | — |
| ensureReady: scanning+有快照 立即返回不阻塞 | unit | 同上 | 同上 | — |
| 派生方法 (getDashboardInsights/getUsageSummary/listSessions) stale 时基于旧 assets 立即返回 | unit | 同上 | 同上 | — |
| 回归: cold-start no-scan(908) / persist-on-refresh(936) / health device-wide(952) 不破 | unit | 同上 | 同上 | — |
| 冷启动首屏秒显 (扫描完成前数据可见, stale→fresh 不闪) | manual (CDP 真跑) | 录屏 + 时序采集 | 见 03-PLAN 任务3 | 组合时序的可观测正确性, 静态 unit 证明不了 (memory runtime-behavior-needs-real-run) |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| ensureReady stale 立即返回 + 后台刷新 | 1, 2 |
| idle/initial/refresh:true 不退化 | 3, 4 |
| CDP 真跑首屏秒显 | 1, 5 |
| 派生方法单测 + 回归 | 6 |
