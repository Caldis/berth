# 任务清单 (Design 产物 / 活清单) — GH-155

从 02-SPEC 拆解。顺序执行为主 (T1/T2 与 T3 文件不重叠可交错; T3-T5 同文件 runtime.ts 严格顺序; renderer 段做前先 git pull 避撞 ui-ux 批次)。
每任务先测试后实现, 目标测试绿即小步提交。

- [ ] T1 engine: `scanProjectDeep` 深扫原语 + shallow ownerTag post-cache 重构 (SPEC C2)
  - tests: `packages/berth-scan-engine/tests/project-deep-scan.test.ts` (新: 嵌套 CLAUDE.md 含 ignore / .claude 深层能力 / config-root 链 / post-cache re-tag 双向不污染); shallow-conventions 等价性补断言
  - verify: `pnpm --filter @berth/scan-engine test` 绿; 不适用 UI
- [ ] T2 main: helper 协议 `scan-project-deep` + host 请求互斥 + `HelperAssetScanner.scanProjectDeep` (SPEC C3)
  - tests: `tests/unit/helper-host.test.ts` 扩展 (新消息路由 / 互斥串行: 并发请求不交错 / kill-respawn 后可再用)
  - verify: `pnpm test` 相关文件绿; 不适用 UI
- [ ] T3 runtime: W3 mid-scan sourceKey 保留合并 (Q1 修复, 独立先行)
  - tests: `tests/unit/agent-asset-runtime.test.ts` 扩展 (扫描中 applyFileChange 后 partial 不回吐 / commit 不回滚 / 删除赢 / 非扫描期无副作用)
  - verify: `pnpm test`; 回归 `incremental-watch.e2e.ts` 本地 (改共享读路径=搜索相关)
- [ ] T4 runtime: W1 `applyBackgroundProjectResult` 折叠+持久化 + W2 commitScan graft (SPEC C5)
  - tests: agent-asset-runtime 扩展 (owned 行界定不误删 session / envelope 恒 default view / 逐 key 行级替换含删除 / graft: 全量扫后 deep 行保留 + 重入队集合产出)
  - verify: `pnpm test`; `snapshot-persistence.e2e.ts` 本地
- [ ] T5 runtime: C4 `BackgroundIndexQueue` + C1 status.backgroundIndex + W4 触发链 (sync/pump/preempt/pause 联动)
  - tests: `tests/unit/background-index-queue.test.ts` (新: lastSeenAt 排序 / 门控三条件 / 前台让位与 preempt 重入队 / pause 冻结 resume 恢复 / revalidation 轮 state 流转 / unsupported 禁用); agent-asset-runtime 补 status 断言
  - verify: `pnpm test`; typecheck; ipc-contract/mock 结构性绿 (无新 channel)
- [ ] T6 renderer: `GlobalIndexingBanner` + app-layout 挂载 + i18n en/zh (SPEC C6; **先 git pull**)
  - tests: `tests/renderer/global-indexing-banner.test.tsx` (新: 渲染条件矩阵 global/indexing/done/M=0 / N-M 文案插值 / raw-key 兜底)
  - verify: `pnpm test`; grep tests/e2e 断言面无 DOM 结构冲突; UI 验收项见 SPEC 界面表 (最终 CDP 在 verify 阶段)
- [ ] T7 e2e: 新 `tests/e2e/deep-index-progress.e2e.ts` + 5 项相关 e2e 本地回归
  - tests: 新 e2e (fixture 多项目含嵌套 skill; poll 断言非活动项目嵌套能力渐进入全局 + banner 出现→N 递增→消失)
  - verify: `pnpm build && pnpm test:e2e` (deep-index / incremental-watch / project-scope / global-shallow-scope / scan-control / snapshot-persistence 全绿, Windows 本地)
- [ ] T8 docs: ARCHITECTURE.md runtime 协作者一行 (queue) + watcher 盲区 issue 追记 (Q2) + mid-scan BUG issue 状态更新 (Q1 入批修复)
  - tests: not needed - 纯文档; 替代验证 `pnpm harness:check`
  - verify: harness:check 绿

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
