# 任务清单 (Design 产物 / 活清单) — GH-155

从 02-SPEC 拆解。顺序执行为主 (T1/T2 与 T3 文件不重叠可交错; T3-T5 同文件 runtime.ts 严格顺序; renderer 段做前先 git pull 避撞 ui-ux 批次)。
每任务先测试后实现, 目标测试绿即小步提交。

- [x] T1 engine: `scanProjectDeep` 深扫原语 + shallow ownerTag post-cache 重构 (SPEC C2)
  - tests: `packages/berth-scan-engine/tests/project-deep-scan.test.ts` (新: 嵌套 CLAUDE.md 含 ignore / .claude 深层能力 / config-root 链 / post-cache re-tag 双向不污染); shallow-conventions 等价性补断言
  - verify: `pnpm --filter @berth/scan-engine test` 绿; 不适用 UI
- [x] T2 main: helper 协议 `scan-project-deep` + host 请求互斥 + `HelperAssetScanner.scanProjectDeep` (SPEC C3)
  - tests: `tests/unit/helper-host.test.ts` 扩展 (新消息路由 / 互斥串行: 并发请求不交错 / kill-respawn 后可再用)
  - verify: `pnpm test` 相关文件绿; 不适用 UI
- [x] T3 runtime: W3 mid-scan sourceKey 保留合并 (Q1 修复, 独立先行)
  - tests: `tests/unit/agent-asset-runtime.test.ts` 扩展 (扫描中 applyFileChange 后 partial 不回吐 / commit 不回滚 / 删除赢 / 非扫描期无副作用)
  - verify: `pnpm test`; 回归 `incremental-watch.e2e.ts` 本地 (改共享读路径=搜索相关)
- [x] T4 runtime: W1 `applyBackgroundProjectResult` 折叠+持久化 + W2 commitScan graft (SPEC C5)
  - tests: agent-asset-runtime 扩展 (owned 行界定不误删 session / envelope 恒 default view / 逐 key 行级替换含删除 / graft: 全量扫后 deep 行保留 + 重入队集合产出)
  - verify: `pnpm test`; `snapshot-persistence.e2e.ts` 本地
- [x] T5 runtime: C4 `BackgroundIndexQueue` + C1 status.backgroundIndex + W4 触发链 (sync/pump/preempt/pause 联动)
  - tests: `tests/unit/background-index-queue.test.ts` (新: lastSeenAt 排序 / 门控三条件 / 前台让位与 preempt 重入队 / pause 冻结 resume 恢复 / revalidation 轮 state 流转 / unsupported 禁用); agent-asset-runtime 补 status 断言
  - verify: `pnpm test`; typecheck; ipc-contract/mock 结构性绿 (无新 channel)
- [x] T6 renderer: `GlobalIndexingBanner` + app-layout 挂载 + i18n en/zh (SPEC C6; **先 git pull**)
  - tests: `tests/renderer/global-indexing-banner.test.tsx` (新: 渲染条件矩阵 global/indexing/done/M=0 / N-M 文案插值 / raw-key 兜底)
  - verify: `pnpm test`; grep tests/e2e 断言面无 DOM 结构冲突; UI 验收项见 SPEC 界面表 (最终 CDP 在 verify 阶段)
- [x] T7 e2e: 新 `tests/e2e/deep-index-progress.e2e.ts` + 5 项相关 e2e 本地回归
  - tests: 新 e2e (fixture 多项目含嵌套 skill; poll 断言非活动项目嵌套能力渐进入全局 + banner 出现→N 递增→消失)
  - verify: `pnpm build && pnpm test:e2e` (deep-index / incremental-watch / project-scope / global-shallow-scope / scan-control / snapshot-persistence 全绿, Windows 本地)
- [x] T8 docs: ARCHITECTURE.md runtime 协作者一行 (queue) + watcher 盲区 issue 追记 (Q2) + mid-scan BUG issue 状态更新 (Q1 入批修复)
  - tests: not needed - 纯文档; 替代验证 `pnpm harness:check`
  - verify: harness:check 绿

## 实现偏差记录 (implement 阶段)

- T5→T7 修正: QueueItem 拆 `scanPath` (leaf, 给 scanner) 与 `root` (给 commit) — 初版只存归一根会漏 monorepo 子目录 `.claude` 能力, 新 e2e 先暴露 (commit 60d63bbf)。
- T7 断言面同步: `global-shallow-scope.e2e.ts` 的 `scanDepth==='shallow'` 是实现细节断言, GH-155 后队列可能已升级为 deep — 改为 owner 归属断言 (预期语义变化, 非回归)。
- T7 归因: `window-controls.e2e.ts` pin 测试本机红 — **基线铁证** (design 提交 3a449fc3 构建同样红) 判非本批引入, 立据 `docs/issues/2026-07-05-BUG-window-controls-pin-e2e-red-on-local-win11.md`。其余 8 文件 28 项全绿。
- T8 扩充: mid-scan BUG issue 移 resolved/ (Q1 入批修复); 母 FEATURE issue 追记 GH-155 交付节。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。

- [ ] T9 (verify 回写, A4/A1 冲突): refresh 入口 preempt 按 reason 门控 — 仅 manual/project-scope/legacy-scan-all (用户可感) 击杀在途后台深扫; watcher/startup 类后台刷新走 helper 串行排队。
  - 证据: CDP 时序采集 (gh155-verify 实例, 真实 27 候选) N 冻结 5/27 达 193s; 调度快照显示 watcher scheduledRefresh 周期性活跃 + lastScanDurationMs=667 — 每 ~30s 的 watcher 刷新无差别 preempt, 扫描时长 >30s 的项目被永久击杀重排 (livelock)。
  - tests: agent-asset-runtime 扩展 (watcher-reason refresh 不 preempt / manual-reason preempt); 队列单测不变
  - verify: 单测绿 + 重建后 CDP 复测 N 递增至 done

