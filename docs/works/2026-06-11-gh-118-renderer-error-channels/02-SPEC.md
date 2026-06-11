# 技术方案 (Design 产物)

> GH-118。方案核心: 4 个 hook 按 useSessions 样板补 error+重试通道 (AC-1), 消费端按「无数据全屏 / 有数据非阻断」条件形态渲染 ErrorState (AC-2), 顺修 healthChecks stale 卡死 (AC-3)。CachedResource/main/IPC 零改动。

## 设计决策 (消解 01-ANALYSIS 未决问题)

1. **条件形态 (与 sessions.tsx:160 样板逐字同构)**: `error && 无数据` → 全屏/区块级 ErrorState (fullHeight) + 重试; `error && 有数据` → 保留数据 + 紧凑非阻断 ErrorState (不清屏, SWR 原则)。app-layout 用 `assets.length === 0` 判定; memory 用 `notes/sources 全空` 判定。
2. **错误文案**: 跟随样板用静态双语 key (title/description), 不直接渲染 raw error message; hook 的 `error` 仍存 raw message (调试可用)。
3. **overview 错误渲染在 panel 组件内** (UsageSnapshotPanel / HealthWorklistPanel 接 `error` + `onRetry` 可选 props, 内容区替换为 ErrorState, 卡片壳与标题保留), 页面 grid 布局不动。
4. **范围排除**: hooks-lifecycle-view 的 HookHealthSignal (次级徽标) 与 instructions.tsx 的 memory 次级消费不加错误 UI (主入口已覆盖); settings platform.info 组件层降级不动 (ANALYSIS 旁支观察)。

## 数据契约 (hook 返回签名扩展, 全部加法)

```ts
// use-ipc.ts
useAssetRuntime(): { loading; refresh; error: string | null; retry: () => void }
//  - 初始链 catch → setError(raw); retry = 清 error + bootstrapNonce 重跑初始链
//  - refresh() catch → setError(raw) (失败可观测; 已有数据保留)
//  - 任一路径成功 → setError(null)
useUsageSummary(days, agentView?, projectPath?): { usage; loading; error: string | null; reload: () => void }
//  - catch → setError; reload = nonce 重触发; 请求开始清 error
useHealthChecks(): { checks; loading; stale; lastCheckedAt; error: string | null; refresh }
//  - catch → setError + setStale(false) (AC-3); refresh 开始清 error; refresh 即重试入口
// use-memory.ts
useMemory(): { result; loading; refreshing; refresh; error: string | null }
//  - catch → setError; load 开始清 error; refresh(=load(true)) 即重试入口
```

IPC / main / CachedResource 契约零变更。`useAssets` 透传 runtime 的 error/retry。

## 消费端渲染 (AC-2 映射)

| 消费端 | 形态 |
|---|---|
| `app-layout.tsx` | `runtimeError && assets.length === 0` → 内容区全屏 ErrorState (fullHeight, sidebar 保留可导航), onRetry=retry; `runtimeError && assets.length > 0` → 内容区顶部紧凑 ErrorState 横幅 (非 fullHeight), 不挡 Outlet |
| `overview.tsx` UsageSnapshotPanel | `error` 时面板内容区 → ErrorState (复用 `usage.loadErrorTitle` + `common.retry`), onRetry=reload |
| `overview.tsx` HealthWorklistPanel | `error` 时面板内容区 → ErrorState (新 key `overview.healthErrorTitle`), onRetry=() => refresh({force:false}) |
| `memory-view.tsx` | `error && 列表空` → 全页 ErrorState (fullHeight, 与 EmptyState 互斥); `error && 有数据` → 列表头部紧凑 ErrorState; onRetry=refresh |

## i18n key 清单 (en/zh 对称)
- 复用: `usage.loadErrorTitle`, `common.retry`。
- 新增: `common.assetsErrorTitle` ("Assets could not be loaded" / "资产数据加载失败"), `common.assetsErrorBody` ("The asset scan request failed. Retry to reload." / "资产扫描请求失败, 可重试加载。"), `overview.healthErrorTitle` ("Health checks could not be loaded" / "健康检查加载失败"), `memory.loadErrorTitle` ("Memories could not be loaded" / "记忆加载失败")。
- 具体措辞 implement 时按区段就近微调, en/zh 必须同 key 同义。

## 任务分类与 debt
- type / maintenance.subtype: maintenance / ui-ux。
- source.kind / refs: docs-issues / `docs/issues/2026-06-10-IMPROVEMENT-renderer-swallowed-error-channels.md`。
- debt.estimate: incurred 1 / repaid 3 / net -2 / module / medium / [ui-ux] / high (explore 已校准, design 无变化)。
- debt.final 预期: 与 estimate 一致。
- Project 字段同步: implement 后 `node scripts/harness-projects.mjs ensure docs/works/2026-06-11-gh-118-renderer-error-channels`。
- `pnpm harness:stats` 总 debt 17 (<40), 无需 override。

## 模块结构 / 组件拆分
- 只改: `hooks/use-ipc.ts` (3 hook 编排) / `hooks/use-memory.ts` / `app-layout.tsx` / `overview.tsx` (两 panel) / `memory-view.tsx` / `en.json` `zh.json` / 测试。
- 复用不新建: `shared/error-state.tsx` 原样消费; 无新组件、无新抽象 (符合 ARCHITECTURE 渲染层边界与 Simplicity First)。

## 界面质量与交互验收

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | overview 错误内嵌 panel 卡片壳内, grid 双栏不动; app-layout 全屏态仅在零数据时出现 | renderer 测试断言 + 真机正常路径回归截图 |
| 组件选择 / 设计系统一致性 | 全部复用 ErrorState (HeroUI Alert danger/faded), 零新视觉语言 | code review 对照 sessions 先例 |
| 交互反馈 / 状态切换 | 重试点击 → loading 态 → 成功清 error / 再失败保持 ErrorState | renderer 测试 (reject→retry→recover) |
| loading / empty / error / disabled / focus | 错误态与空态互斥呈现 (error 优先于 EmptyState); SWR 有数据时不清屏 | renderer 测试三态断言 |
| 响应式 / 可访问性 / 键盘可达 | ErrorState 自带 role=alert; 重试为 HeroUI Button (键盘可达) | 既有组件保证, 不重复验 |
| 文案 / i18n | 上节 key 清单, en/zh 对称 | i18n 对称检查 (jq diff keys) |

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 不写自动化测试的理由 |
|---|---|---|---|---|
| useUsageSummary error+reload | renderer (renderHook) | tests/renderer/usage-summary-error.test.tsx (新) | `pnpm test usage-summary-error` | — |
| useHealthChecks error+stale 复位 | renderer (renderHook) | tests/renderer/health-error.test.tsx (新) | `pnpm test health-error` | — |
| useMemory error+refresh 恢复 | renderer (renderHook) | tests/renderer/memory-error.test.tsx (新) | `pnpm test memory-error` | — |
| useAssetRuntime error+retry | renderer (renderHook) | tests/renderer/asset-runtime-error.test.tsx (新) | `pnpm test asset-runtime-error` | — |
| overview 两 panel 错误渲染 | renderer (render) | tests/renderer/overview-redesign.test.tsx (扩展) | `pnpm test overview` | — |
| memory-view 错误渲染 | renderer (render) | tests/renderer/memory-view.test.tsx (扩展) | `pnpm test memory-view` | — |
| app-layout 条件形态 (全屏/横幅) | renderer (render) | tests/renderer/app-layout.test.tsx (扩展) | `pnpm test app-layout` | — |
| 真机错误态 | — | — | — | CDP 不能 stub contextBridge (friction 20260610), jsdom renderer 测试即错误态证据; 真机做正常路径无回归 |
| 全量回归 | vitest + e2e | — | `pnpm test` + `pnpm test:e2e` (本地) | hook 签名加法变更, 防跨文件回归 |

## 验收标准映射
| SPEC 项 | 对应 ANALYSIS 验收标准 |
|---|---|
| hook 契约扩展 ×4 (数据契约节) | AC-1 |
| 消费端渲染表 ×4 | AC-2 |
| useHealthChecks catch 中 setStale(false) | AC-3 |
| 测试矩阵 renderer 7 项 | AC-4 |
| i18n key 清单 | AC-5 |
| 真机正常路径回归 + jsdom 错误态证据 | AC-6 |
