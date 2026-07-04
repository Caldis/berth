# IMPROVEMENT: 综合审查剩余项清单 (批次四候选: IPC 机制加固 + P3 收敛族)

- 日期: 2026-07-04
- 状态: open
- 来源: 2026-07-04 综合审查 (83k 行, 5 维度)。前置批次已归档: GH-151 (P0/P1 引擎调度/IPC 负载)、GH-152 (P2 引擎/主进程健壮性)、GH-153 (P2 渲染层九项)。
- **写法说明**: 按耐久原则记行为与概念锚点, 不记行号 (原报告行号已过期, 且中间已有多批改动落地); 开批时 explore 必须实读源码逐项核实 (先例: GH-153 explore 九项全核实)。

## 批次四候选: IPC 机制加固族 (中优先)

1. **typed registerHandler**: `src/main/ipc/` 的 handler 注册缺编译期类型约束 — channel 名与 payload/返回类型未从单一契约表派生, 新增 handler 时类型漂移只能靠运行时/对账测试兜底。方向: registerHandler 泛型化, 从 IpcChannels 契约表推导入参/出参类型。
2. **sender 校验**: ipcMain handler 未校验 `event.senderFrame`/sender 来源 — 任何能执行 JS 的帧 (含潜在第三方内容) 都可调用特权 IPC。方向: 统一入口校验 sender 是主窗口 webContents。
3. **typed emit (IpcEvents)**: `webContents.send` 广播侧无类型约束, 事件名/payload 形状靠约定。方向: typed emit helper, 与 IpcEvents 表同源。(注意 friction: 契约对账方向是 表←实现, 先 grep 实发调用点核对真实形状。)
4. **mock 对账双向全等**: 四方对账 (handlers/preload/IpcChannels/mock) 当前单向覆盖 — mock (tests setup) 可含真实 API 不存在的多余方法而不报。方向: 对账测试改双向集合全等。
5. **正则提取加固**: (来自审查健壮性维度) 主进程/adapter 里若干用正则从半结构化文本提取字段的点, 对异常输入静默产出空值; 开批时以 "正则 + 无失败分支" 为特征全量 grep 定位并核实。

## 批次四候选: 安全/正确性小项 (低优先, 可并入)

6. **openPath realpath**: shell openPath 白名单校验基于字面路径前缀, 未 realpath 归一 — symlink/.. 构造可能绕过扫描根白名单 (GH-119 url-guard 的补强)。
7. **openExternal 白名单**: openExternal 对 URL scheme/host 无白名单, 资产内容中的任意链接可拉起外部程序。方向: 限 https/mailto 等安全 scheme。
8. ~~**getEngineInfo 能力元数据失真**~~ **已修 (2026-07-04, GH-154 旁支轻量修复)**: capabilities 从注入 scanner 推导 (workerMode helper=long-lived/worker=one-shot; cancelSupported=scanner.cancel 存在性), 不再硬编码; 见 commit "capabilities 照实" + agent-asset-runtime 测试钉。
9. **worker 链路 cancel 未实现** (维持 open, 低价值评估 2026-07-04): `WorkerAssetScanner` 无 cancel — 仅影响 CLI/引擎默认链路 (生产 Electron 走 helper, 有 kill); CLI 为 one-shot 扫描, 代际 guard 已保证结果正确性, 实现协作取消属协议级改动、收益低。元数据已照实标注 (条目 8), 缺口对消费方可见。方向 (若做): worker.terminate() 硬中止。

## P3 收敛族 (低优先, 独立小批或按需顺带)

10. **DRY 收敛族**: session meta 尾块解析、hook occurrence 统计、工具双份实现、stripRaw 双实现 (main 出程投影 vs 引擎持久化两处) — 每对先核实语义是否真同, 同则收敛单源, 异则注释钉住差异 (先例: ARCHITECTURE 例外清单 "语义不同不收敛")。
11. **巨石组件拆分**: hooks-lifecycle-view (~1.5k 行)、session-detail (~1.2k)、capabilities (~0.9k)、memory-view、agent-capability-plugins-section、scan-engine-settings-section — 按 section/子面板物理拆文件, 不加新抽象 (渲染层审查 #8, 快照见 GH-153 00-BUG)。
12. **React 19 forwardRef 现代化**: virtual-grouped-list/floating-popover 等 forwardRef + 泛型断言可简化为 ref-as-prop (渲染层审查 #12, 非缺陷)。
13. **测试 fixture 收敛**: 多测试文件手搓同构 session/asset/snapshot 工厂, 可抽共享 fixture (注意不过度抽象, 保持每文件可读独立性)。

## 交叉引用

- 前置批次归档: docs/works/_archive/2026-07-04-gh-151-scan-engine-audit-fixes / -gh-152-audit-p2-engine-robustness / -gh-153-audit-p2-renderer-perf-fixes
- 同源旁支 (已单列): 2026-07-04-BUG-mid-scan-partial-clobbers-incremental-folds.md / 2026-07-04-IMPROVEMENT-watcher-paths-fixed-at-start-blind-spot.md / 2026-07-04-IMPROVEMENT-health-panel-no-force-recheck-entry.md
