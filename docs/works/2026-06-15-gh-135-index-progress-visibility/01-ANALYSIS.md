# 01-ANALYSIS — 索引引擎进度可视化与可控性 (GH-135)

> Explore 产物。范围由用户 `/goal` + 后续对话锁定: **完整 B 策略 (周期调度引擎) + 全参数 UI 可配/可视/可调 + 扫描内核独立 helper 进程 + engine 单一数据真源 / GUI 纯投影**。代码勘察第一手 (GH-121 迁包后真实路径); 外部产品调度策略经英文 primary source 检索 (§8); utilityProcess 工程细节由 design 阶段子代理检索补全。

## 1. 三大支柱与性能天花板

1. **可预期 (进度可视化)**: 已扫数量 / 进度 / 预计剩余时间 / 下次扫描周期 / 完整扫描过程, 实时随时间变化。
2. **可中断**: 暂停 / 恢复 / 取消; 协作式 + helper `kill()` 兜底, 不损坏已写数据。
3. **可重置 (带警告)**: 重建索引 (清 `berth-index.db` 全量重扫); 强制警告确认。

**性能天花板 (检索结论)**: worker_threads 拿不到 OS 级 I/O/CPU 节流 (§8.1)。本任务的解法是**把扫描内核迁到独立 helper 进程** (用户拍板, §2.1), 从而在 mac/linux 拿到 OS 原生节流, 真正对标 Raycast"独立进程"根因。Windows OS 节流需 native binding, 列 future (§7 / docs/issues)。

## 2. 架构决策与数据流原则 (本任务地基)

### 2.1 扫描内核独立 helper 进程 (用户选定: helper + mac/linux 节流)
扫描内核从 `worker_threads` 迁到 Electron **`utilityProcess` 长驻 helper**。收益: ① OS 级降优先级 (mac `taskpolicy -b`/linux `ionice -c3`+`renice`, 不连累 UI); ② 崩溃隔离 (helper OOM/原生 crash 不带崩主窗口); ③ 内存/GC 隔离 (独立 V8 堆 + `--max-old-space-size`); ④ 真·可终止 (`kill()` 强化"可中断")。
**一石二鸟**: 母 FEATURE OPEN 主线"长驻 scan worker (消灭每轮 `new Worker` + 双向 structured clone)"被长驻 helper 顺手并掉。
**持久化归属**: `better-sqlite3` (`sqlite-snapshot-store.ts`) 跟随扫描迁入 helper —— 其 drop-in 注入式设计 (electron-free, host 注入 `Database` factory) 已为此解耦做好准备, helper 内注入即可。
**OS 节流**: helper 独立 pid → mac/linux 命令行封装 (design 子代理确认 `taskpolicy -p`/`ionice -p` 对已 spawn pid 施加的可行性); Windows `SetPriorityClass` 列 future issue。

### 2.2 engine 单一真源 / GUI 纯投影 (用户约束)
**原则**: 数据全部维护在 engine, GUI 是 upper layer 只读取/更新, 不做权威维护。
**物理边界 (诚实澄清, 不教条)**: Electron 多进程 + React 下, "GUI 不持有任何数据"无法字面成立 —— renderer 是独立进程, 渲染必须有 JS 对象在渲染进程内存。可落地的**实质**是四条:
1. **无权威真源**: GUI 不 own 任何数据, 只持 engine 状态的单向投影 (read-only mirror)。
2. **无业务逻辑**: 合并/过滤/stats/fold/派生计数全部上提 engine, GUI 只渲染"算好"的数据。
3. **单向数据流**: engine → main → GUI 推送; GUI 永不反向写真源。
4. **命令式写**: 用户操作 (暂停/取消/重置/改参数/刷新/切 scope) = 发命令 IPC 给 engine, engine 改真源后推新状态回 GUI。

**三进程数据流模型**:
```
helper (engine 真源: sqlite + snapshot + status + progress + settings + scheduler + eta, 全部算好)
  ↕ engine↔main IPC (MessagePort)
main  (engine 的 main-side 代理 RuntimeProxy: 转发命令 + 持 engine 状态只读镜像供同步 IPC 响应 + 订阅 helper 推送转广播; 无业务逻辑)
  ↕ main↔renderer IPC (preload typed invoke/subscribe)
GUI   (纯投影: 订阅 engine 状态流渲染; 用户操作=命令; 无真源, 无业务逻辑)
```
**main 定位澄清**: 真源在 helper, 但 main 需一份**只读镜像** (helper 单向同步) 来同步响应高频 IPC invoke (`assets:snapshot`/`status` 不能每次跨两层 IPC await)。该镜像属 engine 层 main-side 投影, 非 GUI —— 故"GUI 不持有数据"成立, main 镜像是 engine 内部实现。

### 2.3 现状违反单一真源的点 (本任务要收口)
- `stores/app.ts:79` `foldKeepingShallow` —— GUI 层业务逻辑 (防闪烁 shallow 保留)。**上提 engine**, engine 发"渲染就绪"完整 assets。
- `sidebar-scan-status.tsx:54` per-category `typeCounts` + `use-index-activity.ts:32` pct 派生 —— GUI 层计算。轻量纯函数派生 (render 时) 可留, 但**有状态语义的计数/stats 上提 engine** (engine 已有 `AssetStats`, 扩展覆盖 category)。
- `use-ipc.ts` `CachedResource` (sessions/health/plugins SWR 缓存) —— GUI 持有数据副本。design 决策: 定位为"engine 状态投影缓存"(保留性能) vs 收口 engine。倾向保留但明确其只读投影语义, 不在缓存层做业务变换。

## 3. 现状勘察 (第一手代码)

### 3.1 进程与链路 (当前)
单例 runtime `getAssetRuntime()` (`runtime.ts:738`), 扫描在 `worker_threads` (`worker.ts`)。链路: `scanner.scanAll`(worker)→`onProgress/onPartial`→`worker-host.ts`→`scan-coordinator.ts`(generation guard)→`runtime.createScanSink`→`setProgress/applyPartial`→`progressListener`→`main/index.ts:234` broadcast `assets:progress`→preload subscribe→`store.applyAssetProgress`→UI。**helper 迁移后**: scanner+持久化入 helper, worker-host → helper-host (main 侧代理), 链路多一跳 engine↔main。

### 3.2 进度链路 (已有 P4.6, 粒度偏粗)
`AssetScanProgress={phase,current,total,label}` (`ipc.ts:51`)。粒度 = **adapter 边界** (`scanner.ts:83-99`, total=adapter 数 2-5, 非文件数)。真实已扫数 = `partial.assets.length`。**缺 ETA/速率/已用时长** → engine 基于历史扫描时长基线算 (`lastScanDurationMs`-elapsed), 放进 progress/status (符合 §2.2 业务逻辑在 engine)。

### 3.3 调度 (现状: 纯被动, 无周期)
仅 watcher 变更 → `scheduleRefresh`(debounce 1s + 限频 30s, `runtime.ts:364`) / 手动 refresh。**无主动周期 timer** —— "下次扫描周期"当前不存在。`schedulerMode='single-flight-queued-project-scope'`; 枚举 `ipc.ts:108` 预留 `'priority-queue'` 未实现。

### 3.4 可中断 (现状: 无)
worker one-shot 无 terminate; coordinator 无 abort; scanner for 循环 adapter 大 await 不可断。`getEngineInfo` 标 pause/cancel=unsupported (`runtime.ts:237`)。→ helper 架构下: adapter 边界协作式 abort + `helper.kill()` 兜底; partial 已 fold, 取消保留已扫部分, 数据安全。

### 3.5 可重置 (现状: 无 public API)
`sqlite-snapshot-store.ts` 仅 schema 变更时 DROP; `SnapshotStore` 接口无 `clear()`。重置 = 清 db + 清 in-memory + 全量重扫。破坏性 + 耗时 (真机 ~10s, GH-117), 警告确认。

### 3.6 设置暴露面 (现状: 2 参数 + 现成框架)
`ScanEngineSettings={watcherDebounceMs,watcherMinIntervalMs}` (`ipc.ts:165`); `settings.ts` DEFAULT+LIMITS+normalize; host JSON store。**关键资产**: `getEngineInfo().controls[]` 已是结构化"可配置参数描述符"(editable/settingKey/min/max/step), `ScanEngineSettingsSection:182` 据此**自动渲染 number input+save** —— 全参数 UI 可配现成框架。当前只支持 number; boolean/string[] 需扩 `ScanEngineControlDescriptor.kind` + UI 分支。

### 3.7 可视化地基
Settings `ScanEngineSettingsSection` (metrics+controls+refreshIndex) / Sidebar `SidebarScanStatus`+`ScanProgressPanel` (脉冲 icon→hover 面板: Progress 条 + phase + per-category 计数) / Ambient `index-activity.tsx` (`IndexPulse`/`IndexHairline` 标题栏扫描线/`IndexingInline`) + `useIndexActivity` 单源派生。**缺**: ETA/速率/下次时间; 暂停/取消/重置入口; 扫描过程时间线。

## 4. Blast Radius (符号边界, helper 架构版, ~22 文件)

**引擎包 (扫描内核, 迁 helper) — 9**
1. `shared/types/ipc.ts` — 契约真源: `ScanEngineSettings` 扩展; `AssetScanProgress` 加 eta/rate/scannedCount; `ScanEngineSchedulerSnapshot` 加 periodic/nextScanAt; `IpcChannels` 加 `assets:pause|resume|cancel|rebuild`; `ScanEngineControlDescriptor.kind`; capabilities 翻转; **engine↔main 命令/事件协议** (新)。
2. `engine/assets/settings.ts` — 全 B 策略参数 DEFAULT+LIMITS+normalize + 3 档预设。
3. `engine/assets/runtime.ts` — pause/resume/cancel/rebuild + 周期 timer + ETA + category stats 上提 + getEngineInfo 扩展; **保持 electron-free 以可入 helper**。
4. `engine/assets/scan-coordinator.ts` — abort + 背压钩子 (注释已预告"链③落此")。
5. **新 `engine/assets/helper-entry.ts`** — utilityProcess 入口 (替/扩 `worker.ts`): 长驻消息循环 + 持久化 + 自降优先级。
6. `engine/assets/worker-host.ts` → **`helper-host.ts`** — main 侧 RuntimeProxy: utilityProcess.fork + 命令转发 + 状态镜像 + 推送广播 + kill。
7. `engine/scanner.ts` — for 循环 abort 检查 + 批间 sleep + 排除路径过滤 + category stats。
8. `engine/assets/snapshot-store.ts` + `sqlite-snapshot-store.ts` — `clear()` + helper 内注入。
9. `engine/watcher.ts` (chokidar) — 可能随扫描入 helper (watcher 触发增量, 与扫描同进程更顺); design 定。

**main — 3**
10. `ipc/handlers.ts` — `registerAssetHandlers` 加 4 命令 channel + 改为转发 RuntimeProxy。
11. `index.ts` — helper spawn/kill 生命周期 + 周期调度启动 + powerMonitor (空闲/电源门控) + OS 节流施加 + 退出清理。
12. `scan-engine-settings.ts` — normalize 自动兼容 (或随真源入 helper)。

**preload — 1**
13. `preload/index.ts` — `api.assets` 加 pause/cancel/rebuild。

**renderer (GUI 瘦身为投影) — 6+**
14. `hooks/use-ipc.ts` — useScanEngineInfo 加 pause/cancel/rebuild + onProgress→loadInfo 节流。
15. `stores/app.ts` — 去 `foldKeepingShallow` 业务逻辑 (上提 engine), 明确投影语义。
16. `components/settings/scan-engine-settings-section.tsx` — 大改: 分组 + 控件类型 + 控制按钮 + rebuild 警告对话框。
17. `components/layout/sidebar-scan-status.tsx` — 去 typeCounts 派生 (读 engine stats); 加 ETA/速率/下次时间 + 暂停/取消。
18. `hooks/use-index-activity.ts` — 读 engine 算好的 eta/rate/nextScanAt。
19. 新增 rebuild 警告确认对话框。
20. `i18n/locales/{en,zh}` — 大量新 key。

**测试 — 3+**: 引擎单测 (settings/coordinator-abort/runtime-pause-cancel-rebuild-scheduler-eta/scanner-abort/sqlite-clear/helper-host 消息协议 mock); `ipc-contract.test` 四方对账 + `tests/setup.ts` mock; e2e 真跑时序 (progress/pause/cancel/rebuild + helper 崩溃恢复)。
**契约纪律**: `ipc.ts:501` 四方对账 (IpcChannels==handlers==preload==tests/setup mock), 新 channel 同批。

## 5. 关键设计决策 (design 收敛)
1. **取消**: adapter-boundary abort + `helper.kill()` 兜底。
2. **ETA**: 历史扫描时长基线; 首次无基线→indeterminate。engine 算 (§2.2)。
3. **周期调度**: 递归 setTimeout (非 setInterval) + `nextPeriodicScanAt` 进 scheduler。
4. **背压**: 应用层 (adapter 间 sleep + 降并发 + loadavg backoff) + OS 节流 (mac/linux)。
5. **全参数 UI**: `ScanEngineControlDescriptor.kind` + 3 档预设 (省电/平衡/性能) + 高级裸值两层 (检索建议防误配, §8.3)。
6. **pause 语义**: "暂停=停周期调度+取消当前, 恢复=恢复调度" (符合 one-shot/long-lived helper); UI 文案说清"已扫结果保留"。Q2。
7. **engine↔main IPC**: MessagePortMain 命令-响应 + 状态推送; main 镜像同步策略 (全量 vs 增量推送) design 定。
8. **runtime 入 helper 的 electron-free 纪律**: runtime/scanner/sqlite-store 已 electron-free, 迁 helper 不破坏; main 侧 helper-host 持 electron 依赖。

## 6. 验收标准 (编号, SPEC/verify 据此)
- **AC-1 进度可视化**: 扫描中实时显示已扫数量+进度+ETA+阶段过程+下次周期; **真跑 CDP 时序断言**, 非静态绿。
- **AC-2 可中断**: 暂停→停; 恢复→继续; 取消→停且保留已扫; capabilities 翻 true; 数据不损坏。
- **AC-3 可重置**: rebuild 清 db+重扫; 强制警告确认; 取消确认不执行。
- **AC-4 全参数可配**: 所有 B 策略参数 (周期/并发/批/sleep/空闲/电源/磁盘下限/排除路径/content-hash/watcher) Settings UI 可见可调可持久化, 改后生效。
- **AC-5 helper 架构**: 扫描跑在独立 utilityProcess; 主 UI 不阻塞 (实测); helper 崩溃可恢复 (重 spawn, 不带崩主窗口); mac/linux OS 节流施加可验证 (helper pid 优先级降级)。
- **AC-6 engine 单一真源**: GUI 无业务逻辑 (fold/stats/category 在 engine); 所有写走命令 IPC; 多窗口投影一致。
- **AC-7 IPC 契约**: 新 channel 四方对账, `ipc-contract.test` 过。
- **AC-8 UI 验收**: 主观视觉/布局/交互**经用户确认**; 空/加载/错误/禁用/focus/paused 态完整; i18n en+zh。

## 7. 未决问题 (design 向人澄清, ≤3)
- **Q1 "下次扫描周期"默认形态**: 增量实时 (chokidar) + 全量兜底间隔默认 24h + 空闲优先; design 给默认值, 走预设档位不需用户拍数字。
- **Q2 "暂停"语义**: 倾向"停止本轮+保留已扫, 恢复=下次调度", UI 文案说清 (worker/helper 难真挂起当前扫描)。
- **Q3 全参数信息架构**: 预设档位 (省电/平衡/性能) + 展开高级裸值 (检索强烈建议防误配)。
> Windows OS 节流 (SetPriorityClass native binding) 已识别为非当前主线后续项 → docs/issues (本任务只做 mac/linux + 交叉引用)。

## 8. 对标参考 + B 策略参数 (英文 primary source)

### 8.1 能力边界 (helper 进程改写了这张表)
| 机制 | OS 原生 | berth **worker_threads** | berth **helper 进程 (本任务)** |
|---|---|---|---|
| I/O 优先级降级 | macOS `IOPOL_THROTTLE` | 拿不到 (降会连累 UI) | **mac `taskpolicy -p`/linux `ionice` 可拿** |
| CPU 调度降级 | macOS Background QoS | 拿不到 | **mac `taskpolicy -b`/linux `renice` 可拿** |
| 内核级负载背压 | Windows Backoff | 拿不到精确版 | loadavg 采样应用层近似 (跨平台) |
| 电源/电池门控 | 两 OS | 能做 | 能做 (Electron `powerMonitor`) |
| 无 GC 可预测内存 | Rust | 拿不到 | 缓解 (helper 独立堆+软上限) |
| 直读 MFT 秒级全扫 | 平台特定 | 拿不到 | 拿不到 (`fs` 遍历+排除) |
| FS 事件增量 | 三者皆用 | 能做 (chokidar) | 能做 |
| 批事务持久化 | Spotlight 分层 | 能做 | 能做 (helper 内 better-sqlite3) |
| 默认范围收窄+排除 | Raycast/Windows | 能做 | 能做 (最高杠杆) |
| Windows I/O/CPU 降级 | `SetPriorityClass` | 拿不到 | **future (需 native binding)** |

helper 进程把 mac/linux 从"拿不到"翻到"拿得到", 这是选 helper 的核心收益。

### 8.2 三系统机制 (浓缩)
- **Spotlight**: `IOPOL_THROTTLE` (官方原文专为 search indexing) + Background QoS (限能效核) + FSEvents 增量 + transient/static 周期合并。
- **Windows Search**: Indexer Backoff (默认开, 高负载降速空闲恢复) + 电源门控 (`PreventIndexingOnBattery`/`RespectPowerModes`) + 磁盘下限 (`PreventIndexingLowDiskSpaceMB`)。暴露给用户的是开关/档位, 不暴露裸阈值。
- **Raycast**: 独立进程 + Rust 无 GC (不卡 UI 根因) + MFT 直读 + FS 事件增量 + 默认范围收窄/多层排除 (.gitignore/.rayignore) + Index Files/Stop Indexing 两动作。

### 8.3 推荐 UI 参数 (11 项, 标 可直接做/近似)
| 参数 | 范围 | 默认 | 能力 |
|---|---|---|---|
| 扫描并发数 | 1–8 | 2 (`min(4,cpu/2)`) | 直接 |
| 批大小 | 100–5000 | 1000 | 直接 |
| **批间 sleep** | 0–500ms | 50 | 近似 (模拟 throttle 核心) |
| 全量重扫间隔 | 关/1h/6h/24h/7d | 24h | 直接 |
| 空闲触发阈值 | 30s–10min+loadavg | 60s + loadavg<核数×0.7 | 近似 |
| CPU 上限 | 10–100% | 50%(电池 25%) | 近似 (helper 后更易控) |
| 内存上限 | 128–1024MB | 512 | helper `--max-old-space-size` |
| 仅 AC 全量 | 开/关 | 开 | 直接 (powerMonitor) |
| 磁盘下限 | 关/500–5000MB | 1024 | 直接 (fs.statfs) |
| **排除路径** | 列表+内置 | `node_modules`/`.git`/`*.tmp`+`.gitignore`/`.berthignore` | 直接 (**最高杠杆**) |
| content-hash | 开/关 | 关 (mtime+size) | 直接 |
**收成 3 档预设 (省电/平衡/性能) + 高级裸值, 防误配**。最高杠杆: 排除路径 + 批间 sleep/并发。

### 8.4 primary source
Apple `setiopolicy_np(3)`/Energy Efficiency Guide/`taskpolicy(8)`; Microsoft Search Policy CSP; Raycast blog+manual+changelog; chokidar; better-sqlite3。URL 见 GH-135 研究子代理记录。

## 9. UI 界面质量与交互验收
- **设计系统**: shadcn 风 (border/card/muted tokens), lucide, `Chip`/`Progress`/`FloatingPopover`, react-i18next, `cn`。进度语言成体系 (accent 脉冲 `index-breathe` + 扫描线 `index-sweep`, 克制非阻塞)。
- **密度**: Settings metrics 4 列 + controls divide-y; Sidebar 走 hover popover。新参数多→分组折叠, 防一屏铺满。
- **路径**: 看进度 (sidebar/hairline) / 调参数 (Settings→Scan Engine) / 控制 (暂停·取消·重置入口: sidebar 面板 + Settings 双入口?)。
- **状态**: 补 paused 态视觉; rebuild destructive 对话框 (有 `border-destructive/30` 先例 `scan-engine-settings-section.tsx:133`); 控件 disabled/saving/focus。
- **a11y/响应式**: 现有 `role=status`/`aria-live=polite`/`aria-label`; 新按钮需 aria+键盘; rebuild 对话框 focus trap+Esc。
- **裁判**: 主观视觉/布局最终**用户确认** (Verify 截图请确认); 数据流/时序走 CDP 真跑断言 (friction `20260609-4.0-verify-static-green-over-runtime-observation`)。

## 10. debt 校准
net 5→**12** (incurred 12, 见 INDEX `debt.revisions`)。范围三次扩张: B 策略周期调度 + 全参数 UI + **扫描内核 helper 进程迁移 + engine 单一真源数据流重构**。~22 文件 multi-process。risk **high** (进程架构变动 + 真源跨进程迁移 + 原生模块 helper 加载 + 取消/重置数据安全 + 数据流上提)。缓冲: runtime/sqlite-store 已 electron-free (迁 helper 顺), `controls[]` 已是可配框架, 检索给出明确参数+天花板, helper 并掉母 FEATURE 长驻主线 (净 debt 含 repaid 项)。areas=[architecture, ui-ux]。confidence medium。
