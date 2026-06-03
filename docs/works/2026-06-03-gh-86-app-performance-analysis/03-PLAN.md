# 任务清单 (Design 产物 / 活清单)

从 02-SPEC 拆解。每任务可独立执行与验证, 顺序确定。implement 阶段维护此清单。
每个实现项必须有测试证据或明确例外理由。
实现中若发现 debt 初估不准, 更新 INDEX.md `debt.estimate`, 并追加 `debt.revisions[]`。

- [x] 任务 1: 新增共享 runtime 契约与 renderer store 状态字段。
  - tests: `pnpm test -- tests/renderer/app-store.test.ts`
  - evidence: 2026-06-03 运行通过, `tests/renderer/app-store.test.ts` 6 tests passed。
  - verify: 类型只描述状态与 snapshot, 不暴露 worker/job 内部细节; UI 验收为状态字段可表达 idle/scanning/ready/stale/error。
- [x] 任务 2: 建立 `src/main/engine/assets/` 中心运行时骨架, 包含 snapshot、status、in-flight、selector 缓存接口。
  - tests: `pnpm test -- tests/unit/agent-asset-runtime.test.ts`
  - evidence: 2026-06-03 运行通过, `tests/unit/agent-asset-runtime.test.ts` 4 tests passed; `pnpm typecheck:node` passed。
  - verify: 非 UI; `sessions:list`、`usage:summary`、`health`、`search` 后续只通过 runtime 读取 snapshot。
- [x] 任务 3: 实现 worker-host 与 worker scan job, 把大文件枚举、JSONL parse、adapter scan 移出 main event loop。
  - tests: `pnpm test -- tests/unit/asset-worker-host.test.ts tests/unit/engine-scanner.test.ts`
  - evidence: 2026-06-03 运行通过, `tests/unit/asset-worker-host.test.ts` + `tests/unit/agent-asset-runtime.test.ts` + `tests/unit/engine-scanner.test.ts` 共 15 tests passed; `pnpm typecheck:node` passed; `pnpm build` passed 且输出 `out/main/asset-worker.js`。
  - verify: 非 UI; main thread 只更新 job/status/snapshot, worker progress 能映射到 `AssetRuntimeStatus.progress`。
- [x] 任务 4: 实现进程内 file fingerprint cache, 覆盖 Claude session 与 Codex rollout 的命中、失效、删除和 parse error。
  - tests: `pnpm test -- tests/unit/asset-file-cache.test.ts tests/unit/codex-session-parser.test.ts tests/unit/session-meta-parser.test.ts`
  - evidence: 2026-06-03 运行通过, `tests/unit/asset-file-cache.test.ts` + `tests/unit/codex-session-parser.test.ts` + `tests/unit/session-meta-parser.test.ts` 共 12 tests passed; worker/scanner 回归 15 tests passed; `pnpm typecheck:node` passed; `pnpm build` passed。
  - verify: 非 UI; 不写磁盘缓存, 遵守只读边界。
- [x] 任务 5: 迁移 IPC、project scope、search、usage、health、sessions 到中心 runtime selectors。
  - tests: `pnpm test -- tests/unit/project-scope-runtime.test.ts tests/unit/search.test.ts tests/unit/usage-summary.test.ts tests/unit/health-check.test.ts`
  - evidence: 2026-06-03 运行通过, `tests/unit/project-scope-runtime.test.ts` + `tests/unit/search.test.ts` + `tests/unit/usage-summary.test.ts` + `tests/unit/health-check.test.ts` + `tests/unit/agent-asset-runtime.test.ts` 共 39 tests passed; `pnpm typecheck:node` passed; `pnpm typecheck:web` passed; `pnpm build` passed。
  - verify: 非 UI; snapshot 未变时 search index 不重复 build; scope 变化触发 runtime refresh 与 watcher restart。
- [x] 任务 6: 重构 renderer runtime hook 与局部 loading UI, 移除全局扫描阻断。
  - tests: `pnpm test -- tests/renderer/use-asset-runtime.test.tsx tests/renderer/overview-performance-loading.test.tsx tests/renderer/sessions-pages.test.tsx tests/renderer/use-health-checks.test.tsx`
  - evidence: 2026-06-03 运行通过, `tests/renderer/use-asset-runtime.test.tsx` + `tests/renderer/overview-performance-loading.test.tsx` + `tests/renderer/use-assets.test.tsx` + `tests/renderer/sessions-pages.test.tsx` + `tests/renderer/use-health-checks.test.tsx` 共 27 tests passed; `pnpm typecheck:web` passed; `pnpm build` passed。
  - verify: Overview metrics、Recent sessions、Usage snapshot、Health worklist 独立 loading/stale/error; navigation/search 不被全局遮罩阻断; loading 文案有 en/zh。
- [x] 任务 7: 性能与集成验证, 更新架构文档。
  - tests: `pnpm build`; `pnpm test:e2e tests/e2e/app.e2e.ts`; 目标 unit/renderer tests 全量运行; `pnpm harness:check --work docs/works/2026-06-03-gh-86-app-performance-analysis`
  - evidence: 2026-06-03 运行通过, `pnpm typecheck` passed; `pnpm build` passed; 目标 unit/renderer tests 16 files / 94 tests passed; `pnpm test:e2e tests/e2e/app.e2e.ts` 14 tests passed。
  - performance: baseline `assets.scanAll=5333ms`, `firstWindowMs=1245`, `heroMs=14459`, `overviewDataMs=44479`; after build scanner `scan.first=7105.8ms`, `scan.second.cache-warm=65.0ms`; worker `worker.first=7252.6ms`, `worker.second.cache-warm=176.0ms`; E2E shell title visible test 728ms, Overview default page assertion 35ms。
  - harness: `pnpm harness:check --work docs/works/2026-06-03-gh-86-app-performance-analysis` 仍被本地既有 global drift 阻断 (`issues/` 根目录与 `.agents/skills/opsx-*` drift); 脚本级 `checkWorks(..., { work })` 返回 `[]`。
  - verify: 记录优化前后 `assets.scanAll`、首屏 shell、Overview hero、Overview 数据完成时间; `docs/ARCHITECTURE.md` 反映中心 runtime + worker 边界; 若正式 harness check 仍被全局 drift 阻断, 附脚本级局部 check 输出。
- [x] 任务 8: 修正 Sessions 验收缺口: 切页采用 stale-while-refresh, loading/empty 使用共享状态组件, 降低会话页点击后的同步渲染成本。
  - source: 2026-06-03 用户验收反馈。
  - tests: `pnpm test -- tests/renderer/sessions-pages.test.tsx tests/renderer/use-sessions-swr.test.tsx`
  - evidence: 2026-06-03 运行通过, 目标 renderer tests 25 tests passed; `pnpm test` 81 files / 589 tests passed; `pnpm typecheck` passed; `pnpm build` passed; `pnpm test:e2e tests/e2e/app.e2e.ts` 14 tests passed。
  - visual: agent-owned Electron (`gh86-sessions-swr`) 验证 Sessions 路由 heading 约 331ms 出现, 800ms 后无全局 loading, 可见 822 个会话按钮; 截图 `/var/folders/v0/318dq8q959z29k7vx374rw400000gn/T/berth-gh86-sessions-swr.png`。
  - harness: `pnpm harness:check --work docs/works/2026-06-03-gh-86-app-performance-analysis` 仍被既有 global drift 阻断 (`issues/` 根目录与 `.agents/skills/opsx-*` drift); 脚本级 `checkWorks(..., { work })` 返回 `[]`。
  - verify: 已有会话数据时切回 Sessions 不显示空白 loading; 后台刷新完成后列表更新; 首次加载与空结果使用统一状态组件; 点击会话行不会被重型同步渲染阻塞。
- [x] 任务 9: 修正 Sessions 渐进渲染状态提示造成的布局抖动。
  - source: 2026-06-03 用户验收反馈; `docs/issues/resolved/2026-06-03-BUG-sessions-progress-layout-shift.md`。
  - tests: `pnpm test -- tests/renderer/sessions-pages.test.tsx`
  - evidence: 2026-06-03 运行通过, `tests/renderer/sessions-pages.test.tsx` 23 tests passed; `pnpm typecheck:web` passed; `pnpm lint` passed; `pnpm harness:issues` active=0 resolved=38。
  - visual: agent-owned Electron (`gh86-layout-shift`) 暂停 idle batch 后验证状态提示可见; 状态槽与筛选框同 top=260/bottom=296/height=36, 列表首组 top=321, toolbarGap=25; 截图 `/var/folders/v0/318dq8q959z29k7vx374rw400000gn/T/berth-gh86-sessions-status-slot.png`。
  - verify: 渐进渲染与后台刷新提示位于筛选工具栏固定状态槽内, 出现或隐藏时不改变筛选栏与列表之间的文档流高度。

执行边界:
- 任务 1-5 触碰同一主进程数据链路, 按编号执行。
- 任务 6 依赖任务 1 和 5 的契约。
- 任务 7 只在代码和 UI 任务完成后执行。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

2026-06-03 verify 反馈: Sessions 切页仍闪 loading, loading/empty 视觉不统一, 点击 Sessions 仍有卡顿; 已追加任务 8 并回到 implement。
2026-06-03 verify 反馈: Sessions 渐进渲染状态提示作为独立区块导致布局抖动; 已追加任务 9 并回到 implement。
