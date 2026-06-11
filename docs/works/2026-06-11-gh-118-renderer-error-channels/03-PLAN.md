# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。**顺序执行** (T1/T2/T4 反复改同一 `use-ipc.ts`, 不并行); 每项 = hook 改动 + 错误分支测试 + 消费端渲染 + 渲染断言 + i18n key, 独立提交。先简后重 (T1 立模式 → T4 最复杂的全局 runtime)。

- [x] T1 (commit 72c2546): `useUsageSummary` 补 error+reload + overview UsageSnapshotPanel 错误渲染 (复用 `usage.loadErrorTitle`)。
  - tests: tests/renderer/usage-summary-error.test.tsx (新: reject→error→reload→recover) + overview-redesign.test.tsx 扩展 (error prop → role=alert); `pnpm test usage-summary-error overview`
  - verify: 面板错误态内嵌卡片壳, grid 布局不动 (renderer 断言)
- [x] T2 (commit 663bf5c): `useHealthChecks` 补 error + catch 中 `setStale(false)` (AC-3) + overview HealthWorklistPanel 错误渲染 (新 key `overview.healthErrorTitle`, en/zh)。
  - tests: tests/renderer/health-error.test.tsx (新: reject→error+stale=false→refresh→recover) + overview-redesign.test.tsx 扩展; `pnpm test health-error overview`
  - verify: 同 T1 形态; stale 不卡 true
- [x] T3 (commit cf3bd31): `useMemory` 补 error + memory-view 错误渲染 (空数据全页 fullHeight / 有数据列表头紧凑, 新 key `memory.loadErrorTitle`, en/zh)。
  - tests: tests/renderer/memory-error.test.tsx (新) + memory-view.test.tsx 扩展 (error→alert, 与 EmptyState 互斥); `pnpm test memory-error memory-view`
  - verify: 错误态 ≠ 空态 (互斥断言)
- [x] T4 (commit def1288): `useAssetRuntime` 补 error+retry (初始链 bootstrapNonce 重跑 + refresh 失败同通道) + app-layout 条件形态 (零数据全屏 fullHeight / 有数据顶部横幅, 新 key `common.assetsErrorTitle/Body`, en/zh) + `useAssets` 透传。
  - tests: tests/renderer/asset-runtime-error.test.tsx (新: status reject→error→retry→recover) + app-layout.test.tsx 扩展 (全屏 vs 横幅两形态断言, MemoryRouter 包裹); `pnpm test asset-runtime-error app-layout`
  - verify: sidebar 保留可导航; 有数据时不清屏
- [x] T5 (commit 3a871d0, CI#27337466621 success): 收口 — i18n en/zh 对称核查过 (en-only 仅既有 `_one` 复数后缀, 新增 4 key 双侧对称) + 全量 988 双轮绿 (修两处测试弱 waitFor race) + build 后本地 e2e 18 passed + 真机回归 (dev:agent gh118-verify 实例, CDP 走总览/记忆页, alerts=0 数据完整, 截图核验后清理) + prepush 全绿 + Project ensure。
  - tests: 全量门禁 (上述命令)
  - verify: AC-6 真机回归 PASS; 全部 AC 复核于 verify 阶段

> 错误态真机不可构造 (CDP 不能 stub contextBridge), jsdom renderer 测试即错误态证据 (02-SPEC 测试策略)。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
