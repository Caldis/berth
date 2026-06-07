# 任务清单 (活清单)

从 02-SPEC 终版设计 (R2 终核) 拆解。两轮 Codex 交叉 review 已完成 (review/round1-codex.md, review/round2-codex.md)。
按"即时可见 → 收敛地基 → 后台浅扫 → 无缝升级 → 回归"分层, 每层独立可验, 小步提交。
每个实现项必须有测试证据或明确例外理由。实现中若 debt 初估不准, 更新 INDEX.md `debt.estimate` + 追加 `debt.revisions[]`。

## 实现项

- [x] **T1 AGENTS.md 跨适配器合并 + agent view 可见性** (即时可见修复, 用户截图问题) — 提交 c9d330c2
  - 改动: 新增 `src/shared/asset-dedupe.ts` (dedupePathKey + stableAssetHash); claude `parseAgentsMd` 加 `meta.dedupeKey`+`readByAgentIds=['claude-code']`+**确定式 id** (A1); codex `parseCodexAgentsMd` 加 `dedupeKey`+`readByAgentIds=['codex']`; engine `mergeSharedConventions` 纯+幂等 (final + partial 两路, A1/D1); 渲染 `assetMatchesAgentView` 读 `readByAgentIds`。
  - 不碰: shallow / 全局 scope / health / hook / mcp / equivalentSources / skills (R2-C 收窄)。
  - tests: ✅ scope-dedupe.test.ts (11) + agent-view.test.ts (6) + engine-scanner 合并集成 (含 partial 无双行)。typecheck/lint/test(783)/build 全绿。
  - 旁支: claude `makeId()` 对 claude-md/skill/agent/command 等仍非确定 → 刷新后选中/raw 重取失败, 同源问题但超 T1 验收范围, 记 docs/issues 交叉引用, 稳定化随 T4 deep-wins key 一并处理。

- [x] **T2 search 跨项目 session 泄漏修复** (收敛地基的可独立落地部分) — 提交 0ac85be1 → 修正 9c89a1bf
  - 初版 (0ac85be1) naive 套 shared `assetMatchesAppScope` → 误排除继承链项目资产, project-scope.e2e 红 (见 friction 20260606 复发)。
  - 修正 (9c89a1bf): `searchScopeAllows` 改 session-aware — per-project 快照里项目/用户/企业资产放行 (本就只属活动项目链, 含继承链), 唯 `session` 跨项目, 非 global 按 shared `assetMatchesAppScope` 过滤到选中项目。
  - 注: main `filterAssetsByProjectPath`/`assetMatchesProjectPath` 已是 shared 委托 (project-scope.ts:10-15), 无重复实现需删。**项目级资产的归属过滤 (pathIsInside/继承链) 收敛到 shared 真源, 推迟到 T3 全局快照** (届时快照含多项目, 才需且才能正确按 owner 过滤; per-project 快照下套 path-inside 反而破坏继承链可见)。
  - tests: ✅ agent-asset-runtime: project 模式 search 过滤跨项目 session + 项目资产放行; 本地 build + project-scope.e2e 通过; 全量 785 全绿。
  - verify: ✅ 本地 windows project-scope.e2e 绿。

- [x] **T3a 项目归属谓词收敛** (deferred-from-T2; 修继承链可见 + 统一 search/列表) — 提交 269d1869
  - shared `assetMatchesProjectPath`: 显式 owner → 按 owner; 无 owner 项目资产 = 活动项目快照所扫 (含继承链) → 放行; 删 `pathIsInsideProject`。runtime.search 改走 shared `assetMatchesAppScope`, 删 T2 stopgap。
  - tests: ✅ scope.test 新契约 + 两 guidance fixture owner 化; build + project-scope.e2e; 全量绿。
- [x] **T3b 全局浅索引所有项目根级约定** (global=全设备核心交付) — 提交 8fffb532
  - 新增 `scanShallowConventions` (仅根级 AGENTS.md/CLAUDE.md, 不深扫能力/嵌套 glob — A2); scanner 深扫后 `appendShallowConventions` 排除活动项目并入 (partial 仍深扫-only — A3); 归属交 T3a 谓词。
  - tests: ✅ shallow-conventions(3) + engine-scanner 集成 (会话派生浅索引 + 活动排除); 全量 789 + build + e2e。
  - **后续 (Codex B① 优化, 非阻塞)**: 浅扫现随深扫同跑 (worker 内); 若项目数多致首扫变慢, 再拆独立低优先级后台 worker + mtime 缓存。功能正确性已具备, 仅延迟优化。

- [ ] **T3-orig resolveScanPlan + 独立后台 worker** (Codex B① 性能优化, 降级为后续)
  - 改动: 新增 `resolveScanPlan {activeProject{dir,roots,depth:'deep'}, shallowProjects[{dir,depth:'shallow'}]}` (真分支, 不复用 projectDirs); 独立低优先级一次性 shallow worker (concurrency=1, mtime 缓存), 首轮前台深扫完成后启动; 浅扫仅根级 conventions (不走 `**/CLAUDE.md` 嵌套 glob, 不扫全部 .claude/.codex); 资产标 `meta.scanDepth='shallow'`; 结果 merge 进 snapshot, 不覆盖活动项目深扫态。
  - 并入 (从 T2 推迟): 全局快照含多项目项目级资产后, 项目级资产的**归属过滤**收敛到 shared 真源 (按 dedupeKey/projectPath/roots 判定 owner, 含 `.git` 继承链), `searchScopeAllows` 与列表 `filterAssetsByAppScope` 对项目级资产统一; 替换 T2 的 session-only 临时过滤。
  - tests: shallow plan 只含根级 conventions (无 skills/agents/commands/深层 CLAUDE.md); 后台 worker 不替换活动 snapshot; global 过滤含多项目浅约定; **project 模式不串其它项目的项目级资产** (含继承链正确归属); 本地 project-scope.e2e 绿。
  - verify: 不适用 (worker/引擎); scope/search 改动按 friction 20260606 硬门禁本地跑 project-scope.e2e。

- [x] **T4 parseClaudeMd 确定式 id (shallow 重扫稳定 key)** (A4) — 提交 54d15f69
  - CLAUDE.md id 改 `claude-md-${scope}-${hash(dedupeKey)}` (镜像 T1 AGENTS.md), 消除全局重扫时 shallow CLAUDE.md re-key 闪烁。issue 2026-06-07-BUG-claude-makeid 更新。
  - shallow→deep "deep wins": 由架构天然满足 — 选中 shallow 项目走 `activateProjectScope` 深扫, `appendShallowConventions` 按仓库根 key 排除活动项目, 故无浅/深重复 (无需显式 key 替换)。
  - B② 无缝升级 (切换时先显浅数据再深扫) = 交互优化, 降级为后续 (功能正确, 仅过渡有 loading)。
  - tests: ✅ scope-dedupe parseClaudeMd id 稳定; 全量 790。

- [x] **T5 多项目全局验收 + 回归** — 提交 b575c35d
  - e2e tests/e2e/global-shallow-scope.e2e.ts: 全局浅索引两项目 + global search 命中两者 + setScope 过滤掉其它项目 (端到端 worker→IPC→谓词)。
  - T3b 完善: 浅扫归仓库配置根 (修 monorepo 子目录会话漏扫根约定) + 按根去重/排除活动。
  - **scanDepth UI 徽标**: 暂不做 (speculative; [约定] 页所有项目约定一致显示无歧义)。失效项目沿用既有 `not-scanned`/`missing` source 语义, 不半写 `stale` (A6 遵守)。
  - **边界**: shallow 仅约定不含能力 → 记 issue 2026-06-07-IMPROVEMENT-global-shallow-index-conventions-only (按需扩展)。
  - tests: ✅ 全量 791 + build + 2 e2e (project-scope + global-shallow) 本地通过; CI 全绿。
  - verify: 功能验收以 e2e 为准 (确定式, 强于一次性截图); 视觉可按需补 electron 截图。

## V2 后台渐进增量索引器 (用户重定义 + Codex 两轮交叉 review 后)
设计见 `02-SPEC-background-indexer.md`。上方 T1/T3a/T4 (去重/owner 谓词/确定式 id) 作地基复用; T3b 浅索引被全量索引取代。每 tier 独立可验 + 小步提交; 改 scope/search/IPC 推送前本地跑 project-scope e2e (friction 20260606 硬门禁)。

- [x] **Pre-T0 身份契约** (第一个 PR, 一切地基; 修 makeid 选中/raw 丢失 bug) — 提交 9d890f05 (a) + 8f39175b (b+c)
  - Pre-T0a: stableAssetHash 加宽 sha256-16hex + 新增 assetEntityId; AGENTS.md/CLAUDE.md 先行接入。
  - Pre-T0b: Claude 全 makeId → assetEntityId (entityKey: 单文件=路径非 name; hook=scenarioHash:hookHash; mcp=name; project-mcp=projectPathKey:name; permission=kind; statusline=settingKey); 删 makeId。
  - Pre-T0c: Codex 6 类 (agent/agents-md/skill/mcp/hook/statusline) 统一到 assetEntityId (修 safeId 有损碰撞 + 升宽 hash; AGENTS.md id 与 Claude 一致可合并); session 保持 sessionId-keyed。
  - tests: ✅ asset-dedupe (6) + parser-identity (8, 含改名稳定/多资产不撞/project-mcp 跨项目/codex 统一); 全量 805 + build + 2 e2e。issue 2026-06-07-BUG-claude-makeid RESOLVED。
- [~] **T0 正确性快赢 — 实施中重排** (Pre-T0 后)
  - **racy-hash 移到 T1**: 实现期发现 in-session 实时 watcher (chokidar 不依赖 mtime) 已覆盖同会话 in-place 改写; racy-fingerprint 漏更新只在**持久化缓存跨重启**时真实发生 → 归 T1 (持久化) 一并做。
  - **watcher 加固已落地** (提交 bfb56eaf): buildWatchOptions 加 awaitWriteFinish(250)+atomic (避免增量解析半写文件 + 滤原子保存噪声); WatchEvent+buildWatchEvent 带 sourceKey (changeset 替换键, Codex A5)。完整 debounce/coalescing 队列仍随 T2 长驻 coordinator 做 (队列天然属性)。
  - 结论: T0 内容并入 T1/T2; 已落地 watcher 加固 + sourceKey 作为 T2 起步。

> **T2 实施前置阻塞 (实施期发现)**: better-sqlite3 虽在 deps+onlyBuiltDependencies, 但 `src` 零使用, 原生二进制按 **Node ABI** 构建, 非 Electron ABI。直接在主进程 import 大概率 `NODE_MODULE_VERSION` 失配。T2 真索引前需先: ①electron.vite.config 把 better-sqlite3 列 external; ②配 electron-rebuild/对 Electron ABI 重建原生模块 (关联 BUILD_ENV friction 原生模块踩坑); ③e2e 验证在打包 Electron 主进程能 open DB。建议作为 T2 第一个独立 spike 增量, 验证通过再建 SqliteSnapshotStore。
- [x] **T1 冷启垫脚石** — 提交 0c8641d1
  - snapshot-store.ts (注入 dir, 版本化 + 原子 rename + 剥 raw); runtime 构造 restorePersistedSnapshot (stale, 不扫) + 提交时仅默认 project 落盘; main initAssetRuntime 注入 userData store。渲染层 SWR 链路 (syncSnapshot 读快照 + stale 触发 refresh) 无需改 ensureReady。
  - tests: ✅ snapshot-store(4) + runtime 冷启(2) + e2e snapshot-persistence (扫描→落盘→重启冷启端到端); 全量 817 + 20 e2e + scan-engine 24 + harness + build 全绿 (整条测试链路闭环)。
- [ ] **T2 单管线 + changeset 协议 + SQLite**: deriveAssetsForPath; worker parse→changeset→main 单 writer 写 SQLite; canonical merge 写库前显式 (sourceKey 替换); sidecar 依赖图 (hooks-state→settings); parse-error 保留旧行标 source_status=error; 单调 checkpoint 防覆盖; 不做 asset_raw 大表 (raw 按需读盘)。tests: 切域零 I/O; 单文件多资产原子替换; 畸形 session 不杀循环; parse error 不丢旧资产; 冷启读 DB 秒出。
- [ ] **T3 全局后台 + 纯过滤 + 完成度**: 后台全量扫全设备 (删/降级 appendShallowConventions); setProjectDir→纯过滤 (search/sessions/health/usage 统一谓词); per-root 完成度状态 (全局空态须 root ≥1 校验完成); 设备级统一 watcher。tests: 全局含其它项目全部资产类型; 切域不重扫; 未扫完不误导空态; project-scope + global e2e。
- [ ] **T4 后置 (实测规模驱动)**: delta partial / session byte-offset tail / FTS5 / SAB 取消 / AIMD / 长驻 worker 池 / 丰富 knob + 暂停-恢复 UI + 性能档位设置。

## 并行/顺序
- T1 (parsers + engine scanner + agent-view) 文件独立于后续 scope 收敛 → 先落, 即时可见。
- T2 必须在 T3 之前 (浅索引把多项目放进 snapshot, 搜索过滤须先收敛, 否则项目搜索串项目)。
- T3→T4→T5 顺序依赖 (浅扫存在 → 升级 → 回归)。
- 各 Tier 内小步提交, 每次只暂存自己文件 + `git diff --cached` 核对。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
