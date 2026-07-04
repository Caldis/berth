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

- [x] T9 (verify 回写, A4/A1 冲突): refresh 入口 preempt 按 reason 门控 — 仅 manual/project-scope/legacy-scan-all (用户可感) 击杀在途后台深扫; watcher/startup 类后台刷新走 helper 串行排队。
  - 证据: CDP 时序采集 (gh155-verify 实例, 真实 27 候选) N 冻结 5/27 达 193s; 调度快照显示 watcher scheduledRefresh 周期性活跃 + lastScanDurationMs=667 — 每 ~30s 的 watcher 刷新无差别 preempt, 扫描时长 >30s 的项目被永久击杀重排 (livelock)。
  - tests: agent-asset-runtime 扩展 (watcher-reason refresh 不 preempt / manual-reason preempt) — 绿 @ 3785e369
  - verify: CDP 复测通过 — N 单调 5→6→8→14→21→27, watcher 全量扫 (t=73.5s) 不再击杀队列, done 即 banner 消失, done→revalidating 静默
- [x] T10 (verify 回写, 双轴评审 Standards 轴): B1 + M1 + M2 + m1/m2/m4 + NIT×3
  - B1 (BLOCKER): graftDeepRows 去重集合改从 kept (过滤后) 构建 — 生产同文件 shallow/deep 行同 id, 原实现两头丢行 (根级资产全量扫后消失至 revalidation); 单测 fixture 改同 id 语义 + 新增同 id 专项; e2e 补第二次 refresh 后根级行存活断言
  - M1 (MAJOR): deep 请求专用 inactivity 窗口 (10min, 用户配 0 仍禁用) + child 收到即回 ack tick — 同步深扫零消息与 120s 看门狗互杀 (大项目被杀记 failed 却计入 indexed)
  - M2 (MAJOR): project-deep-scan capability glob 裸 catch 补 ScanError 记账 (ARCHITECTURE 规则 8)
  - m1: notifyPaused 同步 kill 在飞深扫 (pause 语义对称); m2: rebuild 调 queue.reset() (清 processed, 重建后 banner 重现不失真); m4: sync 命中 inFlight 时更新其 lastSeenAt/scanPath
  - NIT: processed verdict 字段删 (只写不读) / getSnapshot 补 stamp / helper 测试 as never 强转改真实 stub
  - tests: background-index-queue + agent-asset-runtime + helper-host 对应扩展; M2 tests: not needed - glob.sync 抛错需平台权限注入, 记账通道与 nested-glob 同构已有覆盖
  - verify: 全量门禁 + CDP 复测 (watcher 全量扫后根级资产不消失)
- [x] T11 (verify 回写, 窄边缘打包立据): 新 IMPROVEMENT issue — ① 非 default 视图且 default 缓存缺失时后台成果跳过持久化 (窄窗口, 内存正确+下次全量 save 兜底); ② failed 项目计入 indexed 无用户信号/无退避; ③ 死 child 上的排队请求等满看门狗
  - tests: not needed - 纯文档立据
  - verify: harness:check 绿

## verify 最终证据 (2026-07-05)

- **T10 追加发现 (B1-e2e 连锁)**: 新 e2e 重扫断言先红 — `applyPartial` 的 `foldKeepingShallow` 只保 shallow, deep 行在 commit 前被冲掉致 graft 无源 (单测 fake scanner 不发 partial 故未暴露); fold 扩展为同保 deep 行, 单测复刻真 partial 链路钉住。
- 机械门禁 (最终树 @ 28582516): lint / typecheck / 根 1428 + engine 130 单测 / harness:check 全绿; e2e 7 项全绿 (deep-index 含 B1 重扫存活断言 / incremental-watch id 稳定 / project-scope / global-shallow / scan-control / snapshot-persistence)。
- **CDP 时序验收 (A8/A11, 真机 27 候选, 冷启即连)**: 第一轮暴露 T9 livelock (N 冻结 5/27); 修复后两轮复测 — N 单调 5→6→8→14→21→27 与 5→6→8→18→26→27, banner 全程 "已索引 N/M 个项目 / 结果逐步补全中" (截图 banner-indexing.png), done 即消失, done→revalidating 静默且 **N 不回落** (graft 真机生效); 前台交互 (状态拉取/设置写) 全程无阻塞。
- **双轴评审**: Spec 轴 A1-A12 无阻断偏差 (2 PARTIAL 均由 CDP/门禁补齐); Standards 轴 1 BLOCKER + 2 MAJOR + 3 MINOR 全修 (T10), 3 长尾接受立据 (T11)。
- CI: 旧 SHA ab724b83 (T1-T8) 三平台 success; 最终 SHA 28582516 (T9-T11) 旁路等待中, archive 前消费。
- Project 门禁: fields 同步后 strict check 无 gh-155 漂移 (GH-150 两条漂移属另一 session 任务, 不越界)。
- 视觉验收: 用户已授权全程自主 — 按 SPEC 界面条目自验 (banner 文档流内不遮挡、NoticePanel 一致性、双语文案、低频订阅), 截图存档 scratchpad。

