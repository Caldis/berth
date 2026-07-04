# 02-SPEC — GH-153 渲染层九项 (Design 产物)

每条回指 01-ANALYSIS 验收标准编号 (A1-A9/A0)。D1-D5 全部由代码先例自答, 无 PRD 级歧义。

## D 裁决

- **D1 (→A1)**: keyed `CachedResource` (与 sessionsResource/sessionReplayResource 同构)。模块级 `usageSummaryResource = new CachedResource<UsageSummary | null>(USAGE_SUMMARY_CACHE_TTL_MS)`, TTL 30s (贴 SESSION_LIST 档)。key = `JSON.stringify({days, agentView: 归一 null, projectPath: ?? null, costMode: ?? null})`。hook 走 peek 预热 + isFresh 短路 + `request()` in-flight 去重; `reload` = `invalidate(key)` + nonce (镜像 useSessions)。**不加 onChanged 订阅** (现状 widget 不订阅, 不扩范围)。返回契约 `{usage, loading, error, reload}` 不变。
- **D2 (→A3)**: `useAssetRuntime` 收形为 `useAssetRuntimeBootstrap(): {error, retry}` — effect 全保 (初始 status+snapshot、条件首刷、onChanged→syncSnapshot、onProgress→applyAssetProgress), 删除 `s.assetRuntimeStatus` 反应式订阅 (loading 是孤儿返回值); `refresh` 转内部。`useAssets` 整体删除 (唯一调用点 AppLayout 迁走后成孤儿, 规则 9 连带 `use-assets.test.tsx` 删除, `use-asset-runtime.test.tsx` 改钉 bootstrap 语义)。AppLayout: `useAppStore((s) => s.assets.length === 0)` 原子 selector + bootstrap hook 的 error/retry。
- **D3 (→A5)**: `CachedResource` 增 `forceRequest(key, fetcher)`: 无在途 → 等价 `request()`; 有在途 → `pending.catch(() => undefined).then(() => this.forceRequest(key, fetcher))` 递归链后 (在途 settle 后重查, 直到自己成为发起者), 保证 fetcher 必然执行且结果最后落缓存 (写序不倒挂)。`requestHealthChecks(refresh)` 在 `refresh === true` 时改走 `forceRequest`。落点在 CachedResource (可直测、全消费方可复用), 不做 health 局部特判。
- **D4 (→A9)**: `ui/motion.ts` 加法扩展: ① `EASE_CSS = { standard, emphasized }` — 由 `MOTION.ease` 数组**计算生成** cubic-bezier 字符串 (真单源, 不手写重复); ② `LAYOUT_GLIDE = { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }` — **吸收 GH-150 R2 已验收的 FLIP 手感, 数值一字不动** (composed-export 先例: fadeRise/ACCORDION_MOTION_PROPS)。四处替换: overview.tsx:114 → `{duration: MOTION.duration.base, ease: MOTION.ease.standard}` (0.25→0.2 属漂移贴档); dashboard-grid.tsx:104 → `{duration: MOTION.durationMs.base, easing: EASE_CSS.standard}` (180→200ms); dashboard-grid.tsx:164 → `{layout: LAYOUT_GLIDE}` (数值不变); widget-shell.tsx:78 → `{duration: MOTION.duration.base, ease: MOTION.ease.standard}` (仅 ease 归一)。
- **D5 (→A2)**: normalize 留在 usage 页 (手术式, 不改 5 个 widget 输入形状): `const normalized = useMemo(() => (usage ? normalizeUsageSummary(usage) : null), [usage])`。hook 增第 4 可选位参 `costMode?: CostMode` (进 key + 请求体; 5 个 widget 调用点零改动)。页面 `loadError` 由 `error !== null` 派生并**新增错误详情呈现** (error message 进现有错误 UI 的描述位); `hasLoadedUsage` 以 "首次 settle" effect 派生 (`!loading` 首现置 true), 保持参数切换期不闪骨架的现状语义。

## 数据契约

- IPC/preload/main 零改动; `usage.summary` 请求体新增可选 `costMode` 字段**已存在于契约** (usage.tsx 现已发送), hook 侧只是补齐透传。
- store 契约不变; `s.assets.length === 0` 为纯派生读取。
- `CachedResource` 契约加法: `forceRequest` 新方法, 既有方法语义不动。

## 任务分类与 debt

- type=bug / P2 / source.kind=user-request refs=[GH-151, GH-152]。
- debt.estimate: incurred 2 / repaid 3 / net -1 / scope=module / risk=medium / areas=[performance, architecture] — design 后数值不变; confidence medium→high (D1-D5 锁定, 全部有仓内先例), 追加 revisions[]。
- debt pool: total=26 (notice, <40), 非 maintenance 继续的理由: 本批本身是净偿还 (net -1, 消 DRY 违规与 O(n²))。
- Project 字段同步: ensure 已写入; archive 时 done 同步 final。

## 模块结构 / 组件拆分

改动全部落既有文件, 无新文件 (除新测试):
- `hooks/use-ipc.ts`: usageSummaryResource + useUsageSummary(costMode) / useSessionDetail SWR / useHealthChecks force 走 forceRequest / 引擎控制 setError / useAssetRuntimeBootstrap 收形 (删 useAssets)。
- `hooks/cached-resource.ts`: +forceRequest。
- `components/layout/app-layout.tsx`: 原子 selector + bootstrap hook。
- `pages/sessions.tsx`: push + deferredFilter (两处单行)。
- `pages/usage.tsx`: 内联取数 → hook 复用 + normalize useMemo + 错误详情。
- `components/ui/motion.ts`: +EASE_CSS/+LAYOUT_GLIDE; `overview.tsx`/`dashboard-grid.tsx`/`widget-shell.tsx` 引 token。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 零布局改动 (纯数据流/订阅粒度/动效参数) | 全页截图对照无回归 |
| 组件选择 / 设计系统一致性 | 动效参数归一 MOTION 单源; FLIP 手感数值锁定 | grep 无字面魔数 + CDP 编辑态动效目测 |
| 交互反馈 / 状态切换 | 扫描期布局壳不逐 tick 重渲染; 健康"重新检查"必真发 force | CDP: progress 流期间 React 渲染探针 / health IPC 参数捕获 |
| loading / empty / error / disabled | usage 页错误新增详情文案; sessions 空态文案与列表同源; GH-118 blocking/banner 语义不回归 | 单测 (mock 失败) + CDP 实测 usage 错误路径 |
| 响应式 / 可访问性 | 不涉及 (无 DOM 结构变化) | 既有测试回归 |
| 文案 / i18n | usage 错误详情复用既有 error 文案槽位, 不新增 key (若必须新增则双语同批) | i18n 测试回归 |

## 测试策略 (测试矩阵)

| 变更/行为 | 类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| A1 同参去重/异参分流/reload 重取 | renderer | `tests/renderer/use-usage-summary-swr.test.tsx` (新) | `pnpm test:renderer` | — (先红后绿: 现状两实例发两路) |
| A2 usage 页走 hook + costMode 透传 + 错误详情 | renderer | `usage-summary-error.test.tsx` 扩展 + usage 页测试 | 同上 | — (先红: hook 现无 costMode) |
| A3 progress tick 不重渲染 AppLayout / bootstrap 语义 | renderer | `app-layout.test.tsx` 扩展渲染探针 + `use-asset-runtime.test.tsx` 改钉 bootstrap + 删 `use-assets.test.tsx` | 同上 | — (先红: 现状 tick 必重渲染) |
| A4 分组输出契约不变 | renderer | 既有 sessions 分组测试 + 需要时补 characterization | 同上 | 纯内部实现替换, 行为级红灯不可构造 (characterization) |
| A5 forceRequest 语义 + health force 出程 | renderer/unit | `cached-resource.test.ts` (新/扩展) + `use-health-checks.test.tsx` 新用例 | 同上 | — (先红后绿) |
| A6 控制动作失败落 error | renderer | use-scan-engine-info 控制动作用例 (落 settings 族或新建) | 同上 | — (先红后绿) |
| A7 hasAnyFilter 同源 | — | — | — | tests: not needed — useDeferredValue 测试环境同步 settle, 中间态不可构造; 替代验证 = 代码评审 + 既有 sessions 空态测试回归 |
| A8 detail SWR 命中/失效 | renderer | `use-sessions-swr.test.tsx` 新用例 (镜像 replay) | 同上 | — (先红后绿) |
| A9 token 归一 | renderer + grep | `overview-dashboard`/`dnd-kit-smoke` 回归 + grep 无魔数 | 同上 | token 常量本身 tests: not needed — 纯常量, EASE_CSS 生成逻辑随消费方测试覆盖; 动效手感走 CDP 目测 (主观项) |

## 验收标准映射

| SPEC 项 | ANALYSIS 验收标准 |
|---|---|
| D1 | A1 |
| D5 | A2 |
| D2 | A3 |
| B4 push | A4 |
| D3 | A5 |
| B6 setError | A6 |
| B7 deferredFilter | A7 |
| B8 detail SWR | A8 |
| D4 | A9 |
| 全局门禁 | A0 |
