# 需求分析 (Explore 产物)

冷启动首屏被"顶部 loading"阻塞 30s-1min 的**直接根因是 SWR 失效**: 持久快照里明明有上次的全部资产, 却因 `ensureReady` 在 `stale` 状态强制 `await` 整轮全量 scan, 让首屏所有数据 widget 一直 loading 到 scan 结束。等待**时长**由全量 scan 成本 (968 个 session JSONL 全量 parse + OS throttle) 决定。本机 DB 已存在 (2.1MB, 1319 assets), 故用户是**每次冷启动都慢**, 不是仅首次无数据。

## 现状理解
冷启动数据链路 (main → engine → renderer):
- `src/main/index.ts:212` `initAssetRuntime(...)` 在 `createWindow` (:230) **之前**同步执行。构造函数 (`runtime.ts:152`) 同步调 `restorePersistedSnapshot()` (:178): 从 `berth-index.db` 同步 load (better-sqlite3 同步 API) + 对 1319 行逐行 `JSON.parse`。有持久快照时把 `status` 设为 **`'stale'`** 并 seed snapshot。
- renderer `useAssetRuntime` (`use-ipc.ts:166`): 启动先 `status()` + `syncSnapshot()` (拿到 stale 旧 assets 入 store), 再因 `state==='stale'` 调 `refresh()` (后台全量 scan)。`loading = status.state === 'scanning'`。
- Overview (`pages/overview.tsx`) → `DashboardInsightsProvider` → `useDashboardInsights(365,…)` (`hooks/use-dashboard-insights.ts`) → IPC `insights.dashboard` → runtime `getDashboardInsights()` (`runtime.ts:594`) → **`await this.ensureReady()`**。
- `ensureReady` (`runtime.ts:526`): `if (refresh || idle || stale) { await this.refresh({wait:true}); return snapshot }` —— **stale 也阻塞等全量 scan**。
- 全量 scan: `ScanCoordinator.run` → `HelperAssetScanner.scanAll` → utilityProcess `scan-helper.ts` → `AssetScanner.scanAll` (parse 所有 adapter 资产, 主成本是 968 session JSONL)。helper 默认开 OS throttle (`helper-host.ts:210` `taskpolicy -b` 背景优先级, 降速)。

进程边界: main (装配 + IPC + 注入 better-sqlite3/helper) → engine (runtime/coordinator/scanner, electron-free) → renderer (React, 经 preload `window.api` 派生 IPC)。

## 关联与依赖
- `ensureReady` 被 **7 个派生读 IPC** 调用: getDashboardInsights / getUsageSummary / listSessions / getHealthChecks / search / getScanSourceGroups / getProjectCandidates。冷启动它们全部首次命中 stale 阻塞 → 整个 app 数据面 (Overview/Usage/Sessions) 都等同一轮 scan (coordinator single-flight, 只跑一个 scan, 但都阻塞到它结束)。
- `restorePersistedSnapshot` 注释 (`runtime.ts:172`) 自陈 "status stale → renderer triggers background refresh — SWR", 与 `ensureReady` 的 stale 阻塞**直接矛盾** —— 这是缺陷, 不是有意取舍。
- 数据量 (本机 ground truth): 1319 assets, 968 session (73%), DB 2.1MB。warm watcher 全量 scan 实测 3-6s (偶发 22.9s)。

## blast radius (符号边界)
- 核心改动点: `runtime.ts` 的 `ensureReady` (单方法)。判定依据 `AssetRuntimeStatus.state` + `snapshot.id !== 'initial'`。
- 直接受影响: 上述 7 个 runtime 方法 (都经 ensureReady 取 snapshot) → 对应 7 类 IPC handler → renderer 各 hook。改 ensureReady 语义须保证: 首启无快照 (id==='initial') 仍 await; 手动刷新 (refresh:true) 仍 await; 仅 stale+有快照时改为"返回旧 + 后台 fire-and-forget refresh"。
- 测试钉点: `tests/unit/agent-asset-runtime.test.ts` (ensureReady/refresh 时序), insights/usage/sessions IPC 契约测试。
- **不**涉及: UI 组件结构、IPC 通道增删 (四方对账不动)、store 写路径。

## 任务分类与 debt 校准
- type: bug (可观察缺陷, 明确复现); source.kind: user-request / refs: GH-140。
- debt estimate 修正: incurred 3 / repaid 1 / net 2 (从 new 的 4/0/4 下调: 核心是单方法语义修复 + 测试, 且修正既有设计缺陷算小幅偿还)。
- scope: cross-process (main seed 时序 + engine ensureReady + renderer 体感); risk: medium (ensureReady 被 7 个 IPC 共用, 须不破坏首启/手动刷新语义); areas: [performance]; confidence: medium (根因 A 静态确证)。
- revision: 见 INDEX `debt.revisions[]`。

## 验收标准
1. 冷启动 (持久快照存在) 时, 首屏 dashboard widget 在**秒级**显示上次数据 (目标 <1.5s, 与改前基线对比), 不空等全量 scan; 顶部扫描指示与内容显示**解耦** (scan 在后台进行, 内容已可见)。
2. `ensureReady` 在 `stale` 且 `snapshot.id !== 'initial'` 时**不 await 全量 scan**: 立即返回当前 snapshot, 并 fire-and-forget 触发后台 refresh。
3. 首次启动 (无持久快照, `id==='initial'`) 行为不退化: 仍触发 scan; 期间走渐进/骨架, 不报错。
4. 手动刷新 (`refresh:true`) / scanning 中的 `wait` 等待语义不变 (显式要最新数据者仍 await)。
5. 真跑验收 (CDP 时序采集, 非 unit 静态绿): 冷启动录制首屏可见时间线, 断言"用户在 scan 完成前已看到 dashboard 数据" (见 memory `runtime-behavior-needs-real-run`)。
6. 无回归: 7 个派生 IPC 的单测 + 契约测试通过。

## 界面质量与交互验收
- 现状: `AppLayout` 不门控 loading (仅 error+空数据显示全屏 ErrorState); 顶部 `TopNavigation` 下有 `IndexHairline` (细线扫描指示), 侧栏底有 `SidebarScanStatus` (hover 进度面板)。Overview 各 widget 经 `useDashboardInsights` 共享一次 insights, 自身有 loading skeleton。
- 问题: widget 的 loading 实际跟随 insights IPC (阻塞在 scan), 故设计上的"局部 skeleton"在冷启动退化成"全屏等 scan"。
- 验收: 冷启动截图/录屏请用户确认"先看到旧数据、扫描在后台"是否符合预期 (主观视觉 taste 项最终裁判是用户); 注意 stale→fresh 数据切换不应整屏闪烁 (store fold 不变量已防, 需复核 insights 替换路径)。

## 未决问题 (留给 design)
1. **冷启动首扫精确耗时未实测** (历史被高频 watcher scan 刷出 50 条窗口, warm 仅 3-6s)。design 第一动作: 真跑冷启动基线 (冷/暖各阶段耗时), 据此决定是仅修 SWR 门控 (根因 A) 即可达标, 还是需同步优化 scan 成本 (根因 B)。
2. 是否一并处理主进程同步 load 阻塞窗口 (`initAssetRuntime` 在 `createWindow` 前): 大快照 JSON.parse 是否显著延迟窗口出现, 待基线实测。
3. 关联 issue 是否纳入本任务范围 (默认否, 仅交叉引用)。

## 关联 issue (交叉引用, 不在本主线修)
- `docs/issues/2026-06-18-BUG-scan-helper-exits-code-0-mid-scan.md` — scan-helper 中途 exit code 0 致 scan 失败; 冷启动首扫若命中会加剧等待。
- `docs/issues/2026-06-18-IMPROVEMENT-watcher-full-rescan-on-session-write.md` — session 写入触发全库全量重扫; 与冷启动同根 (session parse 是全量 scan 主成本)。
