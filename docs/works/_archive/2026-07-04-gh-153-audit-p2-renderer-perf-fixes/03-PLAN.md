# 任务清单 (Design 产物 / 活清单) — GH-153

从 02-SPEC 拆解。**顺序执行** (T3-T8 六项共享 `use-ipc.ts`, 文件重叠禁并行); T1/T2/T7 与其余文件不重叠但体量小, 不值得开 subagent, 主 session 顺序推进。每项过目标测试后单独提交。

- [x] T1 (B4+B7 → A4/A7): sessions.tsx 分组 O(n²) 改 push + hasAnyFilter 改 deferredFilter
  - tests: buildSessionGroups 导出 + date 分组 characterization 新增 (先钉绿再改实现, 改后仍绿); sessions 族 36/36 绿
  - **偏差 (类型面)**: `VirtualListGroup.items` 为 readonly, 本地 Map 用交叉类型收窄可变 + 末尾 filter 改 TS5.5 推断谓词 (行为不变)
  - verify: A7 属主观时序, 代码评审 + 回归绿 (SPEC 例外已记)
- [x] T2 (B6 → A6): use-ipc.ts 引擎控制 pause/resume/cancel/rebuild catch 转 setError
  - tests: settings-page rebuild 失败呈现 error 块用例, 先红后绿 17/17
  - verify: 不适用 (设置面板既有 error 呈现路径)
- [x] T3 (B5 → A5): cached-resource.ts +forceRequest (递归链后语义) + requestHealthChecks(force) 走 forceRequest
  - tests: cached-resource.test.ts (新) 4 用例 (无在途/链后写序/在途 reject/二次在途递归) + use-health-checks 软刷在途 force 必出程 — 先红 (5 failed) 后绿 9/9
  - verify: CDP ④ 健康面板高频变更期强制重查 (归 4.0-verify)
- [x] T4 (B8 → A8): useSessionDetail 加 keyed CachedResource (镜像 replay 形状, 60s)
  - tests: use-sessions-swr 3 新用例 (TTL 内二次 mount 零 IPC / 按 id 分流 / reload 失效重取) 先红后绿; session-error + sessions-pages 回归 39/39
  - verify: 不适用 (纯取数路径)
- [x] T5 (B1 → A1): usageSummaryResource + useUsageSummary SWR 化 (peek/isFresh/request/invalidate)
  - tests: use-usage-summary-swr.test.tsx (新) 4 用例 — 同参三实例 1 路 IPC / TTL 内 remount 零 IPC / 异 days 分流 / reload 重取, 先红后绿; GH-118 错误语义 + overview 仪表盘回归 11/11
  - **偏差 (测试基建)**: usage-summary-error.test.tsx 补 beforeEach 缓存重置 (模块级缓存引入后的用例隔离, 断言语义不动)
  - verify: CDP ① Overview 5 usage widget 单路 usage.summary (归 4.0-verify)
- [x] T6 (B2 → A2): useUsageSummary +costMode 位参; usage.tsx 内联取数删除、复用 hook + normalize useMemo + 错误详情呈现 + hasLoadedUsage 派生
  - tests: costMode 透传/分 key 两用例 + usage 页错误详情可见用例, 先红 (3 failed) 后绿; usage/overview/GH-118 全量回归 68/68; typecheck+lint 绿
  - **偏差 (契约更新)**: "切回 all-time 重发 IPC" 旧钉改为 "TTL 内命中缓存零重发 + 数据呈现断言" — 缓存语义下的新契约, 往返完整性保留
  - verify: CDP usage 页 days/costMode 切换 + 错误路径实测 (归 4.0-verify)
- [x] T7 (B9 → A9): motion.ts +EASE_CSS (由 ease 数组生成)/+LAYOUT_GLIDE (0.28 数值锁定); overview/dashboard-grid/widget-shell 四处引 token
  - tests: overview-dashboard/dnd-kit-smoke 回归 6/6 + grep 核验 dashboard 域无字面 duration/ease 魔数; typecheck+lint 绿; token 常量 not needed (SPEC 例外已记)
  - verify: CDP ⑤ 编辑态入场/拖拽/hover 动效目测无回归 (归 4.0-verify)
- [x] T8 (B3 → A3): useAssetRuntime 收形 useAssetRuntimeBootstrap {error, retry}; 删 useAssets (+use-assets.test.tsx, 规则 9 孤儿连删); AppLayout 原子 selector `s.assets.length === 0`
  - tests: app-layout-rerender.test.tsx (新, Profiler 探针 + chrome 子组件 stub 隔离) — progress tick 与 status 写零 commit (先红) + 空态翻转对照组; use-asset-runtime/asset-runtime-error 改钉 bootstrap 语义 (manual refresh 用例转 idle 自动首刷路径); GH-118 blocking/banner (app-layout.test) 回归; 全仓 189 文件 1370 测试绿
  - **偏差 (测试工艺)**: 对照组不钉精确 commit 次数 (React 对 useSyncExternalStore 翻转有级联 update, 次数是实现细节), 钉 ">基线"; i18n 需预热否则 loaded 事件污染计数
  - verify: CDP ② 扫描期布局壳无逐 tick 重渲染 (归 4.0-verify)
- [x] 收口: 全局门禁 + 推送 + CI 旁路 + CDP 验收集
  - tests: prepush 全绿 (lint/typecheck/根级 test 189 文件 1370 用例/包内套件/harness:check/baseline); 推 661355e2 → CI 三平台 **success** (旁路子代理回读确认)
  - verify: 见下节

## verify 证据 (4.0-verify, 2026-07-04)

1. **① usage 去重/缓存可观测 (CDP 时序)**: 隔离实例 (dev:agent gh153 + CDP 9223) — 离开 Overview 1.2s 后返回, 0/120/400ms 三帧采样均 `pulses=0, hasCurrency=true` (无骨架、数据即时, 缓存命中); 单测已钉同参三实例 1 路 IPC。
2. **② 扫描期布局稳定 (CDP 时序)**: `refresh({wait:false})` 触发真扫描, 状态序列 scanning→ready; 扫描进行中完成 会话↔总览 页面往返切换, 布局/列表完整渲染 (截图 03), 无卡顿或空白; Profiler 单测钉 progress tick 零 commit。
3. **usage 页往返 (T6)**: 全部→近30天→切回全部, 即时采样 `hasData=true, pulses=0`, 126ms 内数据完整呈现 (缓存 TTL 内零重取, 截图 05/06/07); costMode 透传由既有页面单测钉 (`{days:0, costMode:'auto'}` 请求形状)。
4. **⑤ 动效点开态 (截图)**: 编辑态进入 (自定义→完成)、隐藏 widget → 隐藏的 WIDGET library 入场 (截图 09 点开态)、加回 widget 恢复原布局 (截图 10) — 布局/节奏无肉眼回归; FLIP 数值经 LAYOUT_GLIDE 锁定未变。
5. **④ health force 修正**: 实测发现全 renderer 无任何 `force:true` UI 调用点 (审查设想的"重新检查"按钮不存在) — 机制层修复以 cached-resource/use-health-checks 单测为证 (软刷在途 force 必出程); UI 入口缺口按不变量 10 记 `docs/issues/2026-07-04-IMPROVEMENT-health-panel-no-force-recheck-entry.md`, 不入本批。
6. **机械项**: harness:check 全绿; harness:stats notice (25); Project strict — GH-153 字段同步后 clean (残留两条 GH-150 漂移属他人归档任务, 不越界修, 已在汇报列明); debt.final 已填 (与 estimate 一致, incurred 2/repaid 3/net -1)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。(本轮无不通过项)
