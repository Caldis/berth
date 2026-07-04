# 01-ANALYSIS — GH-153 综合审查修复批次三 (P2 渲染层)

> Explore 产物。现状理解基于 2026-07-04 master (f2ad8cfe → 3552bc2c) 实读源码; 00-BUG 九项证据全部核实为当前真实状态, 无一过期。

## 1. 现状理解 (涉及模块/契约)

全部改动面在 `src/renderer/src/` (hooks + pages + dashboard 组件), **不动 main/preload/IPC 契约** (规则 1 四方对账不触发)。

### B1 useUsageSummary 无去重 (高) — `hooks/use-ipc.ts:548-596`
- hook 为每实例挂独立 `useEffect` 直发 `window.api.usage.summary`; 无缓存、无 in-flight 去重。
- 5 个 widget 调用点核实: spend/token-breakdown/model-distribution/project-allocation 固定 `(30, agentView, projectPath)` 同参; usage-trend 为 `(rangeDays∈{30,90,180}, ...)` 且额外消费 `error/reload`。
- 同文件已有成熟先例: `sessionsResource` (keyed CachedResource + 30s TTL + peek/isFresh/invalidate SWR) 与 `sessionReplayResource` (60s keyed)。`CachedResource.request` 的 in-flight 去重天然消掉同 key N-1 路。
- 注意 usage-trend 的 `rangeDays` 是 per-widget 状态 → **不能**并入单值 `DashboardInsightsProvider` (context 只有一份 365d); keyed 缓存按 key 自然分流。

### B2 usage 页复制粘贴取数 (中) — `pages/usage.tsx:288-330`
- 页面内联 useEffect + `window.api.usage.summary`, 与 hook 差异仅: ① 请求多 `costMode`; ② 结果过 `normalizeUsageSummary` (pkg:src/shared/usage-summary.ts:31, 防御性整形); ③ `catch(() => setLoadError(true))` 丢弃 err 详情 (hook 版保留 message); ④ 维护 `hasLoadedUsage` 首载标志。
- 复用即需 hook 增可选 `costMode` 入参 (进缓存 key); normalize 归属是 design 裁决 (D5): hook 统一 normalize 会顺带改变 5 个 widget 的输入形状 (现消费原始返回, normalize 是纯防御性整形, 理论无损但属行为面)。

### B3 AppLayout 布局根全量订阅 (中) — `components/layout/app-layout.tsx:68-69`
- **关键发现: AppLayout 是全仓 `useAssets`/`useAssetRuntime` 的唯一调用点** (grep 符号边界核实)。`useAssetRuntime` 的 effect 承担引擎 bootstrap 单点: 初始 status+snapshot 拉取、条件首刷、`onChanged→syncSnapshot`、`onProgress→applyAssetProgress` (store fold 唯一喂入口)。**修复不能简单撤 hook, bootstrap 订阅必须保持恰好一次挂载。**
- 重渲染源两处: `useAssets` 订阅 `s.assets` (每次 fold 新数组引用) 仅用于 `.length === 0`; `useAssetRuntime` 订阅 `s.assetRuntimeStatus` (每 progress tick 新对象) 仅用于返回 `loading` — 而 AppLayout 根本不消费 `loading`/`refresh`/`stats`。即布局根的两路订阅在当前唯一调用点下**全是纯开销**。
- 修复形状: bootstrap 效果保留在 AppLayout 挂载的轻 hook (仅返回 `error/retry`, 不订阅 store 反应式状态), 判空改原子 selector `useAppStore((s) => s.assets.length === 0)` (boolean 稳定, fold 时 selector 重算但不触发重渲染)。`useAssets`/`useAssetRuntime` 的 `loading`/`stats` 返回若因此成为孤儿, 按删除纪律 (规则 9) 同批处理 (见 D2)。
- 既有测试钉行为: `app-layout.test.tsx`、`asset-runtime-error.test.tsx` (GH-118 blocking/banner 语义)、`use-assets.test.tsx`、`use-asset-runtime.test.tsx`。

### B4 sessions 日期分组 O(n²) (中) — `pages/sessions.tsx:317-319`
- `existing.items = [...existing.items, session]` 每条复制整桶; sessions 页取全量 (无 limit), 数千条落同一 "older" 桶即 O(n²); useMemo 在筛选/排序/语言切换时重算。
- 桶数组是 `buildSessionGroups` 本函数新建的局部值, 原地 `push` 无共享引用风险; `count` 同步改法不变。输出契约完全不变 (characterization)。

### B5 health force 被在途软刷吞掉 (中) — `use-ipc.ts:56-63,598-672` + `cached-resource.ts:55-65`
- `requestHealthChecks(refresh)` 恒用 key `''`; `CachedResource.request` 命中 in-flight 直接返回旧 promise → `force:true` 的 fetcher 从未执行。onChanged 软刷新常驻在途时, 用户点"重新检查"实际拿到软刷结果。
- 修复语义要点 (D3): 不能简单 `invalidate` 后重发 — 旧 in-flight settle 时仍会 `set()` 回写缓存, 与 force 结果产生写序竞态; 更稳的是 force 请求**链在在途 promise 之后** (settle 后必发一次 `refresh:true`), 保序且保证 force 真实出程。
- 既有测试: `use-health-checks.test.tsx`。

### B6 引擎控制吞错 (中) — `use-ipc.ts:325-339`
- `pause/resume/cancel/rebuild` 均 `.catch(() => undefined)`, 违反规则 8; 同 hook `setError` 通道现成 (saveSettings/refreshIndex 均用)。修复 = catch 转 `setError`, UI (设置面板) 已有 error 呈现路径。

### B7 hasAnyFilter 不同源 (低) — `pages/sessions.tsx:119,213-214`
- 列表管线用 `deferredFilter` (`:58-68`), 空态文案判定用即时 `filter` → 快速输入时 "无匹配结果" 文案先于数据切换闪现。单行改 `deferredFilter.trim()`。agentView/modelFilter 在管线与判定中均为即时, 本就同源, 不动。

### B8 useSessionDetail 无 SWR (低) — `use-ipc.ts:445-486`
- replay 有 60s keyed `sessionReplayResource` (GH-116, 注释明示 tab 来回不重复 IPC), detail 逐次全量重取。修复 = 镜像 replay 形状: keyed CachedResource + peek/isFresh 预热 + reload invalidate。

### B9 动效参数绕开 MOTION token (低) — 四处
- `ui/motion.ts` 自述 "transition timing 单源": duration fast .15/base .2/slow .3; ease standard/emphasized (framer 数组), **无 CSS 字符串形态**。
- 实测四处硬写: ① `overview.tsx:114` `{duration:0.25, ease:'easeOut'}` (widget-library 入场); ② `dashboard-grid.tsx:104` dnd-kit `dropAnimation {duration:180, easing:'ease-out'}` (**ms + CSS 字符串**, 非 framer); ③ `dashboard-grid.tsx:164` framer layout `{duration:0.28, ease:[0.22,0.61,0.36,1]}` (**GH-150 R2 刚调过的 FLIP 手感, 用户已验收**); ④ `widget-shell.tsx:78` `{duration:0.2, ease:'easeOut'}`。
- ③ 属有意调参 (改值 = 回归用户已认可手感), 单源化应**吸收为命名 token** 而非改值; ①②④ 属漂移, 贴靠既有档位。dnd-kit 需要 CSS easing 字符串 → token 侧需补字符串形态 (D4)。

## 2. 关联与依赖 (符号边界 blast radius)

| 改动面 | 直接消费者 |
|---|---|
| `use-ipc.ts` useUsageSummary | 5 个 widget + `usage-summary-error.test.tsx`; B2 后 + `pages/usage.tsx` |
| `use-ipc.ts` useHealthChecks / requestHealthChecks | health 面板消费方 + `use-health-checks.test.tsx`、`health-error.test.tsx` |
| `use-ipc.ts` useScanEngineInfo (B6) | 设置页引擎节 + `settings-page.test.tsx` 族 |
| `use-ipc.ts` useSessionDetail (B8) | `pages/session-detail.tsx` + `use-sessions-swr.test.tsx` (replay 先例钉在此) |
| `use-ipc.ts` useAssets/useAssetRuntime (B3) | **仅 AppLayout** + `use-assets.test.tsx`/`use-asset-runtime.test.tsx`/`app-layout.test.tsx`/`asset-runtime-error.test.tsx` |
| `cached-resource.ts` (B5 若加 force 语义) | 全部 CachedResource 消费方 (行为只增不改) + 自身直测 |
| `pages/sessions.tsx` (B4/B7) | 页内局部; sessions 测试族 + `virtual-grouped-list.test.tsx` (分组输出契约) |
| `pages/usage.tsx` (B2) | 页内局部; usage 测试族 |
| `ui/motion.ts` (B9 token 扩展) | 全仓 MOTION 消费方 (加法扩展, 存量值不动) |
| `overview.tsx`/`dashboard-grid.tsx`/`widget-shell.tsx` (B9) | overview-dashboard/dnd-kit-smoke 测试 |

store (`stores/app.ts`) fold 不变量、main/preload 均不触碰。

## 3. 任务分类与 debt 校准

- type=bug / P2 / scope=module / risk=medium / areas=[performance, architecture] — 维持 0.0-new 估算 (incurred 2 / repaid 3 / net -1)。
- explore 未改变影响面量级; B3 修复形状比审查建议更收敛 (唯一调用点 → 孤儿 API 同批清理反而减代码)。confidence 维持 medium, design 锁定 D1-D5 后升 high。
- revision: 无 (数值与 scope/risk 不变)。

## 4. 验收标准 (verify 据此逐条核对)

- **A1 (B1)**: 同参多实例 `useUsageSummary` 单位时间只发一路 `usage.summary` IPC (in-flight 去重 + TTL 内缓存命中); 不同 days (30 vs 90) 各自独立取数; `reload` 强制绕过缓存重取。单测以 mock `window.api` 计数断言。
- **A2 (B2)**: `pages/usage.tsx` 不再内联 `window.api.usage.summary`, 复用 useUsageSummary (含 costMode); 错误路径保留详情 (不再仅布尔); days=0/costMode 切换行为不回归 (现有 usage 测试 + 新用例)。
- **A3 (B3)**: ① 扫描 progress tick / 快照 fold 不再触发 AppLayout 重渲染 (单测: probe 计数, applyAssetProgress 后 AppLayout 渲染次数不变; 资产从 0→N 或 error 变化时正常重渲染); ② bootstrap 语义不回归 (初始 status/snapshot 拉取、条件首刷、onChanged/onProgress 订阅唯一挂载 — 既有 use-asset-runtime 测试全绿); ③ GH-118 blocking/banner 错误语义不回归。
- **A4 (B4)**: buildSessionGroups 输出契约不变 (既有分组测试绿); 追加/保留 characterization 覆盖日期分组多条同桶。
- **A5 (B5)**: 软刷新在途时调 `refresh({force:true})` → `healthCheck({refresh:true})` 必然出程且其结果最终落缓存 (写序不被软刷结果倒挂); 无在途时 force 行为不变。先红后绿。
- **A6 (B6)**: pause/resume/cancel/rebuild 失败时 `error` 状态被置为 err message (先红后绿); 成功路径不变。
- **A7 (B7)**: 空态文案判定与列表数据同源 (`deferredFilter`)。
- **A8 (B8)**: 同一 session id 二次进入 detail 在 TTL 内不再发 IPC (peek 预热 + isFresh 短路); reload 强制重取; 错误/加载态语义与现状一致。
- **A9 (B9)**: 四处动效参数全部引 MOTION token, dashboard 域无字面 duration/ease 魔数 (grep 核验); ③ 处 FLIP 手感数值不变 (token 吸收); CDP 截图确认 overview 编辑态入场/拖拽动效无肉眼回归。
- **A0 (全局门禁)**: typecheck / lint / test / harness:check 全绿; 每项先写或更新目标测试。

## 5. 未决问题 (design 裁决, 无 PRD 级歧义, 不 block)

- **D1 (B1)**: 去重机制 — keyed `CachedResource` (倾向, 与 sessions/replay 同构, 天然支持 usage-trend 多 days) vs 并入 InsightsProvider (不可行: 单值 context 装不下 per-widget days); TTL 取值 (倾向复用 30s 档) 与 onChanged 是否软刷 (现状 widget 不订阅 changed, 倾向维持现状不扩范围)。
- **D2 (B3)**: `useAssets`/`useAssetRuntime` API 收形 — bootstrap 轻 hook 命名与返回面; `loading`/`stats` 孤儿成员是否同批删除 (规则 9: 删自己改动产生的孤儿, 连带测试改写)。
- **D3 (B5)**: force 绕过实现 — 链在在途之后 (倾向, 保写序) vs invalidate+重发 (有旧 promise set() 回写竞态); 落点在 CachedResource (加 forceRequest, 全消费方受益) vs health 局部。
- **D4 (B9)**: token 形态 — motion.ts 增 CSS easing 字符串形态 + (若吸收 ③) layout 命名 token; ①②④ 贴靠 base/standard 的具体映射。
- **D5 (B2)**: normalizeUsageSummary 归属 — hook 统一 normalize (widget 输入形状顺带整形, 行为面扩大) vs usage 页局部保留 (倾向, 手术式)。

## 6. 界面质量与交互验收 (不变量 22)

- 现状结构: Overview = DashboardInsightsProvider 包裹 widget 网格 (dnd-kit 拖拽 + framer FLIP); usage 页 = days/costMode 切换 + 图表/分解列表; sessions 页 = 工具栏筛选 + GroupedVirtuoso; 设置页引擎节含控制动作与 error 呈现。设计系统: HeroUI 仅经 ui/, MOTION token 单源 (本批收口其漂移)。
- 本批 UI 可观测点: ① Overview 挂 5 个 usage widget 时打开页面, usage.summary 只出一路 (数据一致、无逐 widget 先后闪现差异); ② 扫描进行中 (progress 流) 布局壳 (Sidebar/TopNav/Search) 无逐 tick 重渲染, 页面滚动/交互不抖; ③ sessions 快速输入过滤词, 空态文案与列表切换同步无闪现; ④ 健康面板在文件高频变更期间点"重新检查", 结果为强制重查产物; ⑤ overview 编辑态 widget-library 入场、拖拽落位、widget hover 控件渐显 — 与改前肉眼一致 (③ 处手感数值锁定)。
- 数据流/时序类 (①②④) 按不变量 22 需 dev 实例 CDP 真跑观察; 动效 (⑤) 截图对照。空/加载/错误/禁用态: usage 页错误详情呈现为本批新增可见行为, verify 时实测 mock 失败路径。

## 7. 旁支发现

无新增 (审查报告 P2/P3 未入批项已在 GH-151/152 归档产物与后续 5.2-issues 计划中列账; 本次 explore 未发现报告之外的新问题)。
