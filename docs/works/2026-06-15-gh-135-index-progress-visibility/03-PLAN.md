# 任务清单 (Design 产物 / 活清单) — GH-135

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
**顺序/并行边界**: Phase A (契约地基) 必须先行; Phase C (helper 迁移, high risk 架构) 与 Phase B (引擎逻辑) 都依赖 A, 且 B 的 cancel/scan 依赖 C 的 helper-host, 故 **A→C→B→D→E→F 主链顺序**; phase 内不重叠文件的子项可并行 (标注)。全程小步提交: 每子项过对应单测即提交。

## Phase A — 契约与引擎数据层 (顺序, 地基)
- [x] A1: `ipc.ts` 契约扩展 (ScanEngineSettings 全参数 / AssetScanProgress eta·rate·scanned / ScanEngineSchedulerSnapshot paused·periodicScan·lastScanDuration / ScanEngineControlDescriptor kind·group·options / IpcChannels +pause·resume·cancel·rebuild / capabilities 翻转) + `tests/setup.ts` mock 同批 + preload `api.assets` 占位方法
  - tests: `tests/unit/ipc-contract.test.ts` 四方对账 (表==handlers==preload==mock); `pnpm test`
  - verify: 不适用 (非 UI); `pnpm typecheck` + `pnpm --filter @berth/scan-engine typecheck` 全绿
  - 偏差: channel (pause/resume/cancel/rebuild) + preload 方法挪 **D1** 与 handlers 四方同批 (ipc-contract 严格全等要求三方+mock 同批; runtime 命令方法 B2 就绪)。commit f04aa9b
- [x] A2: `engine/assets/settings.ts` 全参数 DEFAULT + LIMITS + 3 档 PRESETS + normalize (boolean/string[]/preset 合并, 改裸值→custom) — 已并入 A1 commit f04aa9b
  - tests: `engine/assets/settings.test.ts` 全分支 (clamp/step/preset 应用/custom 回落); `pnpm --filter @berth/scan-engine test`
  - verify: 不适用
- [x] A3: `SnapshotStore.clear()` 接口 + sqlite 实现 (`DELETE FROM asset; DELETE FROM snapshot_meta` 事务, best-effort)
  - tests: `engine/assets/sqlite-snapshot-store.test.ts` 注入假 Database 验 DELETE + 幂等; 同上命令
  - verify: 不适用

## Phase C — helper 进程迁移 (顺序, high risk 架构地基)
- [x] C1: `src/main/scan-helper.ts` 入口 (utilityProcess child, process.parentPort 长驻收 scan) + `src/main/helper-host.ts` (ScanHelperHost 单例 long-lived fork + HelperAssetScanner 实现 AssetRuntimeScanner) + main 注入 createScanner + before-quit kill + 打包 input
  - tests: `tests/unit/helper-host.test.ts` (5) 注入假 child 验 fork/spawn/scan/done/长驻复用/error/exit-respawn/kill; `pnpm test`
  - verify: `pnpm build` 产出 out/main/scan-helper.js + scanner chunk (alias resolve OK); 全量 typecheck/lint/test 绿。**真机 spike (helper 进程实跑扫描) 待做**
  - 偏差: ① helper 入口放 **src/main** (process.parentPort 是 electron API, 保引擎 electron-free; 引擎 WorkerAssetScanner/worker_threads 保留给 CLI); ② 打包沿用 `rollupOptions.input` (保守, 非 ?modulePath); ③ payload **暂保持 cache** (跨进程传), 去 cache (file-cache 留 helper) 列 C1b 后续; ④ cancel/OS节流/child-process-gone 自愈 → C2
- [x] C2: OS 节流 (helper-host `child.on('spawn')` execFile mac `taskpolicy -b -p`/linux `ionice -c3`+`renice`, CLI 失败降级不阻断, 可注入 applyThrottle) + 崩溃自愈 (`app.on('child-process-gone')` 判 serviceName log 因, host ensure 下次 scan 自 respawn) + 去无效 execArgv (NODE_OPTIONS 警告) + capabilities.osThrottleSupported 翻转
  - tests: `tests/unit/helper-host.test.ts` +2 注入 applyThrottle spy 验 throttle 施 pid / osThrottle=false 跳过; `pnpm test`
  - verify: 单测 + 全量门禁绿。**真机验 taskpolicy 实降 helper pid 优先级 → Phase C 统一 spike**
  - 偏差: ① helper 内 `os.setPriority` 自降兜底未做 (host execFile 已 cover mac/linux; 自降列后续); ② 崩溃自愈是被动重 spawn (下次 scan), child-process-gone 仅 log 因
- [x] C3: `main/index.ts` 接线 — helper 单例生命周期 (createScanner 注入 + before-quit kill + child-process-gone) 已在 C1/C2 完成; 周期 timer + powerMonitor 注入 → B3 (runtime 调度就绪后接 main 启动)
  - tests: 不适用 (electron 组合根无单测宿主); C1/C2 单测 + C1 真机 spike 覆盖
  - verify: ✅ **C1 真机 spike 通过** — helper (node utility) 跑扫描 1213 资产 → berth-index.db 2MB, long-lived 不退出, 无崩溃, 主 UI 不阻塞

## Phase B — 引擎真源逻辑 (顺序, 依赖 A/C; 子项 B1/B4 与 B2/B3 文件局部可并行)
- [x] B1: runtime ETA (enrichProgress: etaMs 基线/scannedAssets/ratePerSec/elapsedMs) + `lastScanDurationMs` 基线 + `foldKeepingShallow` 上提 (store→runtime applyPartial; store 退化纯投影)
  - tests: `tests/unit/agent-asset-runtime.test.ts` +2 (fold 保 shallow / enrichProgress scanned+elapsed); `tests/renderer/app-store.test.ts` 2 个 store-fold 测试改纯投影断言; `pnpm test`
  - verify: 不适用 (逻辑层); ETA/fold 时序最终经 F1/F2 e2e CDP 真跑
  - 偏差: category typeCounts 留 GUI 纯派生 (render 时纯函数, 非持有真源, §2.3); 未扩 AssetStats
- [x] B2: runtime pause/resume/cancel/rebuild 状态机 + `scheduler.paused` (cancel→coordinator.cancel→scanner.cancel/helper kill, partial 保留; rebuild→snapshotStore.clear+snapshotCache.clear+重扫) + capabilities/controls 翻 true
  - tests: `tests/unit/agent-asset-runtime.test.ts` +3 (cancel 保留已扫+drop late / pause 停调度+取消 / rebuild clear+重扫); `pnpm test`
  - verify: 不适用 (逻辑层); 端到端语义经 F2 e2e CDP 真跑
- [x] B3: runtime 周期调度 (schedulePeriodic 递归 setTimeout + nextScanAt 暴露 + idleOnly/acOnly 门控注入 PowerMonitorLike) + main 注入 electron powerMonitor + whenReady 启动; 周期 re-arm 在 runPeriodicScan 末尾 (非 commit)
  - tests: `tests/unit/agent-asset-runtime.test.ts` +1 (fake timer + 假 powerMonitor 验 battery defer → AC scan); `pnpm test`
  - verify: 不适用 (逻辑层); 真机周期/空闲行为经 F1 e2e / manual
- [x] B4: scanner 背压 (adapter 间 `sleep(batchPauseMs)`) + 排除路径过滤 (filterExcludedPaths 剔 path in excludePaths) + backpressure 传递链 (settings→runtime→coordinator→scanner→worker data→worker/scan-helper)
  - tests: `packages/berth-scan-engine/tests/scanner-backpressure.test.ts` (4) filterExcludedPaths; `pnpm --filter @berth/scan-engine test`
  - verify: 不适用 (逻辑层); batchPauseMs sleep 时序节流经 e2e/manual
  - 偏差: ① excludePaths 是结果后过滤 (非 adapter 入口剔, 仅减结果集不减扫描成本); ② `respectGitignore` setting 未接 engine (列 issue, adapter 层深度); ③ batchPauseMs sleep 无专门单测 (时序节流不改结果) → 记 issue

## Phase D — main IPC + preload (顺序, 依赖 A/B)
- [x] D1: `ipc.ts` IpcChannels +pause/resume/cancel/rebuild + `handlers.ts` registerAssetHandlers 转发 runtime + `preload` api.assets 4 方法 + `tests/setup` mock 4 方法 (A1 挪此的 channel 四方同批)
  - tests: `tests/unit/ipc-contract.test.ts` 四方对账 (IpcChannels==handlers==preload==mock); `pnpm test`
  - verify: 不适用 (契约层)

## Phase E — renderer GUI 投影 (依赖 A/B/D; E2/E3/E4 文件不重叠可并行, E5 最后)
- [x] E1: `store/app.ts` 去 foldKeepingShallow (纯投影, 已在 B1) + `use-ipc.ts` useScanEngineInfo 加 pause/resume/cancel/rebuild actions + onProgress→loadInfo 节流 250ms
  - tests: app-store.test 纯投影断言 (B1); settings-page/use-asset-runtime 绿; actions 薄 wrapper 端到端经 E2/E3 + F; `pnpm test`
  - verify: 不适用 (逻辑层)
- [x] E2: `ScanProgressPanel` 扩展 (ETA/速率/下次扫描时间行, 读 engine 值) + 控制按钮 (暂停/恢复/取消)
  - tests: `sidebar-scan-status.test.tsx` +4 (ETA/速率 / 下次扫描时间 / pause+cancel 派发 / resume 派发); `pnpm test` 绿 (commit 1f36bb4 + 14e7813)
  - verify: CDP 截图请用户确认 (待真机)
  - 偏差: ① 控制按钮**并入 ScanProgressPanel 底部** (安静文字按钮), 未单开 `ScanControlBar`; rebuild 按钮归 E3 设置面板 (破坏性操作不放 hover 浮层); ② **下次扫描/paused 提示只在 hover 浮层内, idle 态浮层不可达** — always-on 暴露下次扫描周期由 **E4 ambient 指示**承担 (本次需求核心"可见下次扫描周期"主线落 E4); ③ 为单测导出 `ScanProgressPanel` (hover popover 在 jsdom 脱离过快无法做活动树按钮查询)
- [x] E3: `ScanEngineSettingsSection` 扩展 (controls 按 group 渲染 + kind→toggle/number/string-list/enum 控件 + preset 档位) + 新 `RebuildConfirmDialog` (destructive, 破坏性+不可撤销提示)
  - tests: `settings-page.test.tsx` mock 补 kind/group 对齐真实契约 + 既有保存派发用例绿; runtime `setSettings` preset→custom 断言; `pnpm test` 绿 (commit c80442d)
  - verify: CDP 截图请用户确认 (待真机); rebuild 对话框 HeroUI Modal 自带 focus trap+Esc
  - 偏差: ① 引擎侧 `buildScanEngineSettingControls` (settings.ts) 产 typed 控制描述, GUI 纯按 kind/group 渲染 (真源逻辑留 engine, 符方案 X); ② preset 以 Select 呈现非"档位卡"; ③ `readonlyValue` 对 `supported:false` 显"暂不支持"沿用旧语义
- [x] E4: `use-index-activity.ts` + `index-activity.tsx` 读 engine eta/rate (去 GUI 派生) + 设置面板常驻"下次扫描"行
  - tests: `index-activity.test.tsx` +3 (hook 读 etaSeconds/ratePerSec + undefined 兜底 / IndexingInline 追加 "~Ns left"); `settings-page.test.tsx` +1 (下次扫描行); `pnpm test` 绿 (commit 8918f4d + 2fda8cf)
  - verify: ambient inline 仅追加 ETA 文本 (克制), hairline/pulse 视觉基线不变; nextScan 落始终可达的设置面板
  - 偏差: ① eta/rate 取自 progress 流 (B1 已 enrich), useIndexActivity 保持纯 store 派生, **不在 always-mounted hairline 引 IPC**; ② 下次扫描周期 always-on 落点改为**设置面板** (+ 侧栏浮层), 非 ambient 脉冲 (避免 always-mounted 组件依赖 engineInfo IPC); ③ ambient inline 只显 ETA 不显 rate (rate 噪声留侧栏面板)
- [x] E5: i18n en+zh 全 key (settings.scanEngine.* 参数/预设/控制/rebuild 警告 + nextScan; nav.scanStatus.* ETA/速率/下次时间)
  - 随 E2/E3/E4 落地: nav.scanStatus.{eta,rate,nextScan,paused,pause,resume,cancel} + settings.scanEngine.{groups,rebuild,nextScan,values,controlLabels,controlDescriptions,excludePlaceholder} en+zh 全齐
  - tests: settings-page/sidebar/index-activity 测试断言均走真实 i18n (英文文案), 无 raw key 泄漏; `pnpm test` 绿
  - verify: 双语完整, 真机截图终检 (随 E2/E3 截图一并确认)

## Phase F — e2e + 真机验收 (依赖全部)
- [ ] F1: `scan-progress.e2e.ts` CDP 时序: 扫描中已扫数量增长 + ETA 递减 + 阶段流转 + 下次时间出现 (真跑 observable 流)
  - tests: `pnpm test:e2e`
  - verify: 断言落在用户持续看到的动态 (runtime-behavior-needs-real-run)
- [ ] F2: `scan-control.e2e.ts`: 暂停停扫 / 取消保留已扫 / rebuild 清空重扫 + 数据安全
  - tests: `pnpm test:e2e`
  - verify: 取消后已扫资产仍在; rebuild 后从 0 重扫
- [ ] F3: helper 崩溃自愈 e2e (kill helper 验重 spawn + 主窗口不崩)
  - tests: `pnpm test:e2e`
  - verify: 崩溃后下次 scan 恢复
- [ ] F4: OS 节流真机抽验 (mac/linux helper pid 优先级降级)
  - tests: manual; 例外理由: OS 调度行为无自动化宿主, 真机命令抽验
  - verify: `taskpolicy`/`ionice` 显示 helper pid 为 background/idle class

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
