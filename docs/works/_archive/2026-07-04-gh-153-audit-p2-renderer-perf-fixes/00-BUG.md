# 00-BUG — 原始输入快照 (只读)

来源: 2026-07-04 综合审查 (83k 行, 5 维度并行审查 + 主 Agent 逐条复核) 的**渲染层子报告**全文。批次一 (P0/P1 引擎调度/IPC) 见 GH-151, 批次二 (P2 引擎/主进程健壮性) 见 GH-152。

## 本批范围标注

入本批 (九项): 高#1, 中#3/#4/#5/#6/#7, 低#10/#11, 及低#9 (MOTION token)。
不入本批: #2 (assets:changed 扇出 — GH-151 已在 main 侧接入 TrailingCoalescer, 消费侧重 IPC 已由源头合并兜底); #8 (巨石组件拆分) 与 #12 (forwardRef 现代化) 属 P3 重构族, 留 5.2-issues 沉淀。

---

## 渲染层审查子报告原文 (src/renderer/src)

总体评价: 架构纪律执行良好 —— `@heroui/react` 准入零违规 (仅 `ui/` 与 `App.tsx` 的 Provider)、store fold 不变量在类型层封死、大列表均已虚拟化 (sessions/replay/scan-history 走 Virtuoso, replay 时间轴用 canvas)、insights 走 context 单次取数、竞态基本都有 `cancelled`/`mountedRef` 防护。问题集中在 **usage.summary 取数路径没有复用既定的缓存/共享机制** 和 **assets:changed 事件的扇出放大**。

### 高

**1. `useUsageSummary` 无缓存无去重, 多 widget 并发发同参重 IPC — 违背仪表盘自己声明的性能不变量**
- 位置: `src/renderer/src/hooks/use-ipc.ts:548-596`; 调用点 `components/dashboard/widgets/{spend,token-breakdown,model-distribution,project-allocation,usage-trend}.widget.tsx`
- 缺陷: `insights-context.tsx:5-6` 明确写着"避免每 widget 各发一次 IPC (性能不变量)", 但 usage.summary 这条路径完全没走 context 或 `CachedResource` —— 5 个 widget 各自 `useUsageSummary(30, agentView, projectPath)`, 各挂独立 `useEffect` 直发 IPC (主进程对全量 session 做成本聚合)。
- 触发: 默认布局含 usage-trend + spend 等; 用户把 5 个 usage widget 全开启后, 打开 Overview 即 5 路相同请求, 每次切 agentView / project scope 再 ×5。
- 修复: 参数相同即共享 —— 最小改法是给 usage.summary 套一个带 key 的 `CachedResource` (in-flight 去重即可消掉 N-1 路), 或并入 `DashboardInsightsProvider`。

**2. `assets:changed` 扇出放大: 4 个订阅方各自触发重 IPC, 且无任何合并/节流** (不入本批, GH-151 已修 main 侧)
- 位置: `use-ipc.ts:188` (onChanged → 全量 snapshot 拉取)、`use-ipc.ts:659-664` (onChanged → health 重查)、`use-dashboard-insights.ts:56-59` (onChanged → 365 天 insights 全量聚合 reload)、`use-ipc.ts:345-347` (onChanged → engineInfo)
- 缺陷: 主进程只对 `assets:progress` 做了 coalesce, `assets:changed` 逐事件直发; renderer 侧 4 个订阅方都是"来一个事件发一次重 IPC"。
- 处置: GH-151 T-S5 已在 main 侧为 changed 广播接入 TrailingCoalescer (leading+trailing), 事件源头已有界; 消费侧不再重复加防抖。

### 中

**3. `AppLayout` 在布局根订阅整个 `assets` 数组只为判空, 扫描期每 tick 全布局重渲染**
- 位置: `components/layout/app-layout.tsx:68-69`
- 缺陷: `useAssets()` 订阅 `s.assets` (每次 snapshot/partial fold 都是 IPC 结构化克隆出的新数组引用) 和 `s.assetRuntimeStatus` (每个 progress tick 新对象), 但 AppLayout 只用到 `assets.length === 0`。扫描期 progress ~4 次/秒, 每 tick 重渲染 AppLayout → Sidebar/TopNavigation/SearchDialog/InspectorDrawer 全部重渲染 (`children` 因元素引用不变可跳过)。
- 修复: 改为原子 selector `useAppStore((s) => s.assets.length === 0)`, error/retry 单独用不订阅 status 的轻量 hook; 不在布局根消费 `useAssets`。

**4. sessions 日期分组 O(n²) 数组复制**
- 位置: `pages/sessions.tsx:317-319`
- 缺陷: `existing.items = [...existing.items, session]` 每追加一条复制整个桶数组。sessions 页取全量列表 (无 limit), 几千条 session 大多落进同一个 "older" 桶时是 O(n²); 该 `useMemo` 在每次筛选/排序/语言切换时重算。
- 修复: 桶数组是本函数新建的, 直接 `existing.items.push(session)` 即可。

**5. usage 页复制粘贴了 `useUsageSummary` 的取数逻辑, 且吞掉错误详情、默认全量无缓存**
- 位置: `pages/usage.tsx:292-330`
- 缺陷: 页面内联手写 useEffect + `window.api.usage.summary` (与 hook 仅差一个 costMode 参数), 属重复组件对; `catch(() => setLoadError(true))` 把 err 信息整个丢弃 (hook 版保留 message 给用户); 默认 `days=0` (全量历史聚合) 且无任何缓存, 每次进入 /usage 都全量重算。
- 修复: 给 `useUsageSummary` 加 costMode 参数并复用 (顺带获得统一的错误透传), 套 `CachedResource` 短 TTL。

**6. `useHealthChecks` 强制刷新会被在途软刷新吞掉**
- 位置: `use-ipc.ts:56-63` + `614-646`, 配合 `cached-resource.ts:55-65`
- 缺陷: healthResource 缓存键固定 `''`, `refresh({force:true})` 时若 onChanged 触发的 `refresh:false` 请求在途, `CachedResource.request` 直接返回在途 promise —— `refresh:true` 从未发出, 用户"重新检查"实际拿到的是软刷新结果。
- 触发: 扫描/文件变更频繁时 (onChanged 软刷新常驻在途) 用户点健康面板的强制重查。
- 修复: force 路径绕过 in-flight 去重, 或把 refresh 标志纳入缓存键。

**7. 引擎控制动作裸吞错**
- 位置: `use-ipc.ts:326-338` (pause/resume/cancel/rebuild 均 `.catch(() => undefined)`)
- 缺陷: 用户点暂停/恢复/取消/重建索引失败时, UI 无反馈、不落 setError, 也不进日志 —— 与项目规则 8 "禁止裸 catch 吞错"相悖 (同 hook 里其它路径都有 setError 通道现成可用)。
- 修复: catch 里走 `setError`。

**8. 巨石组件文件 (>400 行阈值 2-4 倍)** (不入本批, P3 重构族)
- 位置: `components/capabilities/hooks-lifecycle-view.tsx` (1542 行)、`pages/session-detail.tsx` (1232)、`pages/capabilities.tsx` (913)、`components/memory/memory-view.tsx` (845)、`components/settings/agent-capability-plugins-section.tsx` (778)、`components/settings/scan-engine-settings-section.tsx` (767)
- 修复: 按 section/子面板物理拆文件即可, 不需要新抽象。

### 低

**9. dashboard 侧直接 import framer-motion 且硬写动效参数, 绕开 MOTION token**
- 位置: `pages/overview.tsx:4,114` (`duration: 0.25, ease: 'easeOut'` —— 不在 `ui/motion.ts` 的 fast/base/slow 任何档位)、`components/dashboard/dashboard-grid.tsx:16`、`widget-shell.tsx:4`
- 缺陷: 不违反规则 6 的字面 (只限定 @heroui/react), 但 `ui/motion.ts` 自述是 "transition timing 单源", dashboard 这三处自带一套参数, 动效节奏开始漂移。
- 修复: 时长/缓动改引 `MOTION` token。

**10. `hasAnyFilter` 与列表数据不同源**
- 位置: `pages/sessions.tsx:119`
- 缺陷: 空结果文案判定用即时 `filter`, 列表用 `deferredFilter` —— 快速输入时二者短暂不一致, "无匹配结果"文案可能先于数据切换闪现。
- 修复: 判定改用 `deferredFilter`。

**11. `useSessionDetail` 无 SWR 缓存, 与 `useSessionReplay` 不对称**
- 位置: `use-ipc.ts:445-486`
- 缺陷: replay 有 60s `CachedResource` (注释: tab 来回不重复走 IPC), detail 没有 —— 同一 session 返回列表再进入即重取全量 detail (主进程指纹缓存兜底, 代价可控但白走一趟 IPC + 序列化)。
- 修复: 照 replay 模式给 detail 加 keyed `CachedResource`。

**12. React 19 下 forwardRef 属过时模式** (不入本批, P3)
- 位置: `components/shared/virtual-grouped-list.tsx:235-239` (forwardRef + 泛型 as-cast 双重仪式)、`floating-popover.tsx` 等
- 说明: React 19 支持 ref 作为普通 prop。项目未启用 React Compiler, 手动 useMemo/useCallback 不算冗余。仅为可简化项, 非缺陷。

### 未发现问题的方面 (审查已验证)

- `@heroui/react` 准入: 6 个 import 全部在 `components/ui/` + `App.tsx` (HeroUIProvider), 零违规。
- store 写路径: 只有 `setAssetSnapshot`/`applyAssetProgress`, 无裸替换 action; 全仓无 `useAppStore()` 全量订阅 (均为 selector)。
- 虚拟化: sessions (GroupedVirtuoso)、replay 事件列表 (Virtuoso, 20k cap)、scan-history (Virtuoso) 均已覆盖; replay 时间轴 canvas 绘制, 数学层在 `lib/replay-model.ts` 可直测。
- 竞态: `useSessions`/`useSessionDetail`/`useUsageSummary`/`useDashboardInsights` 均有 cancelled/mountedRef 防过期写入; `CachedResource` 的签名保持 (`sessionListSignature`) 正确避免了同数据刷新时的引用抖动。
- i18n: 资源静态打包、无懒加载抖动; 未发现热路径插值滥用。
