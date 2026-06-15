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
- [ ] C2: OS 节流 (helper-host `child.on('spawn')` execFile mac `taskpolicy -b -p`/linux `ionice -c3`+`renice` + helper `os.setPriority` 兜底, CLI 失败降级不阻断) + 崩溃自愈 (`app.on('child-process-gone')` serviceName 判 reason 重 spawn) + `before-quit` 清理
  - tests: `helper-host.test.ts` 注入假 execFile/假 child-gone 事件验降级与重 spawn; 单测命令
  - verify: manual 真机 mac/linux `taskpolicy`/`ionice` 抽验 helper pid 优先级 (OS 行为静态推不出)
- [ ] C3: `main/index.ts` 接线 (helper 单例生命周期 + 周期 timer 启动 + powerMonitor 注入 runtime)
  - tests: 不适用 (electron 装配, 经 C1/C2 单测 + e2e 覆盖); 例外理由: main 组合根无单测宿主
  - verify: `pnpm dev` 启动扫描跑在 helper 进程 (进程检测), 主 UI 不阻塞

## Phase B — 引擎真源逻辑 (顺序, 依赖 A/C; 子项 B1/B4 与 B2/B3 文件局部可并行)
- [ ] B1: runtime ETA + `lastScanDurationMs` + category stats 上提 (扩 AssetStats 覆盖 category) + `foldKeepingShallow` 上提 (从 store 移入 runtime commit/partial)
  - tests: `engine/assets/agent-asset-runtime.test.ts` 注入 now/duration 验 eta/rate; fold 上提后 partial 含完整数据; 单测命令
  - verify: 不适用
- [ ] B2: runtime pause/resume/cancel/rebuild 状态机 + `scheduler.paused` (cancel→helper kill, partial 保留; rebuild→clear+refresh)
  - tests: 同 runtime 测试文件, 注入假 helper-host 验 status/scheduler 转移 + clear 调用 + 数据保留; 单测命令
  - verify: 不适用
- [ ] B3: runtime 周期调度 (递归 setTimeout + nextScanAt + idleOnly/acOnly 门控注入 powerMonitor)
  - tests: 同上, fake timer + 假 powerMonitor 验排程/门控/paused 不排; 单测命令
  - verify: 不适用
- [ ] B4: scanner 背压 (adapter 间 `sleep(batchPauseMs)`) + 排除路径过滤 (excludePaths/.gitignore 入口剔除)
  - tests: `engine/scanner.test.ts` sleep spy + 假 fs 验过滤 + 节流; 单测命令
  - verify: 不适用

## Phase D — main IPC + preload (顺序, 依赖 A/B)
- [ ] D1: `handlers.ts` registerAssetHandlers 注册 pause/resume/cancel/rebuild 转发 runtime + `preload/index.ts` api.assets 落实 4 方法
  - tests: `ipc-contract.test.ts` 复跑四方一致; `pnpm test`
  - verify: 不适用

## Phase E — renderer GUI 投影 (依赖 A/B/D; E2/E3/E4 文件不重叠可并行, E5 最后)
- [ ] E1: `store/app.ts` 去 foldKeepingShallow (纯投影) + `use-ipc.ts` 加 pause/resume/cancel/rebuild actions + onProgress→loadInfo 节流 (250ms)
  - tests: `stores/app.test.ts` 投影纯赋值; `hooks/use-ipc.test.ts` actions 发命令 + 节流; `pnpm test`
  - verify: 不适用 (逻辑层)
- [ ] E2: `ScanProgressPanel` 扩展 (ETA/速率/下次扫描时间行, 读 engine 值) + 新 `ScanControlBar` (暂停/取消/重建按钮)
  - tests: `sidebar-scan-status.test.tsx` 渲染 eta/下次时间 + 按钮派发命令; `pnpm test`
  - verify: 进度面板布局层级/信息密度 (ETA 行不挤压现有) + paused 态视觉 + 按钮 disabled/spinner 反馈 + 延续脉冲语言不引入 gray slab (CDP 截图请用户确认)
- [ ] E3: `ScanEngineSettingsSection` 扩展 (controls 按 group 折叠 + kind→toggle/number/string-list/enum 控件 + preset 档位卡) + 新 `RebuildConfirmDialog` (destructive, focus trap+Esc, 破坏性+耗时双提示)
  - tests: `scan-engine-settings-section.test.tsx` 各 kind 控件渲染 + 保存派发 + 对话框确认/取消; `pnpm test`
  - verify: 设置面板分组信息密度 (16 参数不平铺) + 控件设计系统一致 + rebuild 对话框 destructive 样式/键盘可达 + i18n 无 raw key (CDP 截图请用户确认)
- [ ] E4: `use-index-activity.ts` + `index-activity.tsx` 读 engine eta/rate/nextScanAt (去 GUI 派生)
  - tests: `use-index-activity.test.ts` 读投影值; `pnpm test`
  - verify: ambient 指示 (hairline/inline) 维持克制语言, 不变更现有视觉基线
- [ ] E5: i18n en+zh 全 key (settings.scanEngine.* 参数/预设/控制/rebuild 警告; nav.scanStatus.* ETA/速率/下次时间)
  - tests: i18n key 完整性 (现有 i18n 测试若有) 或手验双语; `pnpm test`
  - verify: 双语完整, UI 无 raw key 泄漏 (截图)

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
