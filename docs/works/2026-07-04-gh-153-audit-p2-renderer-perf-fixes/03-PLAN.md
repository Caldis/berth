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
- [ ] T4 (B8 → A8): useSessionDetail 加 keyed CachedResource (镜像 replay 形状, 60s)
  - tests: use-sessions-swr 新用例 — TTL 内二次 mount 零 IPC / reload 失效重取, 先红后绿
  - verify: 不适用 (纯取数路径)
- [ ] T5 (B1 → A1): usageSummaryResource + useUsageSummary SWR 化 (peek/isFresh/request/invalidate)
  - tests: use-usage-summary-swr.test.tsx (新) — 同参双实例 1 路 IPC / 异 days 分流 / reload 重取, 先红后绿
  - verify: CDP ① Overview 5 usage widget 单路 usage.summary (归 4.0-verify)
- [ ] T6 (B2 → A2): useUsageSummary +costMode 位参; usage.tsx 内联取数删除、复用 hook + normalize useMemo + 错误详情呈现 + hasLoadedUsage 派生
  - tests: costMode 透传进请求体 (先红) + usage 错误详情可见 + 既有 usage 测试回归
  - verify: CDP usage 页 days/costMode 切换 + 错误路径实测 (归 4.0-verify)
- [ ] T7 (B9 → A9): motion.ts +EASE_CSS (由 ease 数组生成)/+LAYOUT_GLIDE (0.28 数值锁定); overview/dashboard-grid/widget-shell 四处引 token
  - tests: overview-dashboard/dnd-kit-smoke 回归 + grep dashboard 域无字面 duration/ease 魔数; token 常量 not needed (SPEC 例外已记)
  - verify: CDP ⑤ 编辑态入场/拖拽/hover 动效目测无回归 (归 4.0-verify)
- [ ] T8 (B3 → A3): useAssetRuntime 收形 useAssetRuntimeBootstrap {error, retry}; 删 useAssets (+use-assets.test.tsx); AppLayout 原子 selector; use-asset-runtime.test.tsx 改钉 bootstrap
  - tests: app-layout 渲染探针 (progress tick 不重渲染 / 0→N 与 error 变化正常重渲染, 先红) + bootstrap 语义回归 + GH-118 blocking/banner 回归
  - verify: CDP ② 扫描期布局壳无逐 tick 重渲染 (归 4.0-verify)
- [ ] 收口: 全局门禁 (typecheck/lint/test/harness:check + prepush 含 test:scan-engine) + 推送 + CI 旁路 + CDP 验收集 (①②④⑤ + usage 错误路径)
  - tests: A0
  - verify: 4.0-verify 汇总证据

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
