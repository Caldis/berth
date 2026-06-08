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

> **T2 前置 de-risk (2026-06-08 ✅ 通过, 阻塞解除)**: ①`electron.vite.config` main 的 `externalizeDepsPlugin()` 自动 external 所有 deps (含 better-sqlite3), 无需手动列 — **天然满足**; ②`postinstall: electron-builder install-app-deps` 已把 node_modules 的 `better_sqlite3.node` 重建为 **Electron ABI 130** — **天然满足** (探针 `spike/sqlite-abi-probe.cjs`: 系统 Node ABI137 `require` 失败, `ELECTRON_RUN_AS_NODE=1 electron` 成功 open DB+WAL+事务+CRUD); ③`snapshot-persistence.e2e` 已端到端验证打包主进程 open `berth-index.db`+落盘+冷启读出。**关键约束 (反推为设计约束)**: 单测 host (系统 Node) 永远无法 `require` Electron-ABI 的 `.node` → `SqliteSnapshotStore` 的 `Database` 句柄经构造器注入 (结构化 `SqliteDatabase` 接口, store 自身不 import 原生模块; 单测 fake, 真实 import 只在 `index.ts`)。
- [x] **T1 冷启垫脚石** — 提交 0c8641d1
  - snapshot-store.ts (注入 dir, 版本化 + 原子 rename + 剥 raw); runtime 构造 restorePersistedSnapshot (stale, 不扫) + 提交时仅默认 project 落盘; main initAssetRuntime 注入 userData store。渲染层 SWR 链路 (syncSnapshot 读快照 + stale 触发 refresh) 无需改 ensureReady。
  - tests: ✅ snapshot-store(4) + runtime 冷启(2) + e2e snapshot-persistence (扫描→落盘→重启冷启端到端); 全量 817 + 20 e2e + scan-engine 24 + harness + build 全绿 (整条测试链路闭环)。
- [~] **T2 单管线 + changeset 协议 + SQLite** (de-risk + 持久层落地; 增量写协议待续)
  - [x] **SQLite 持久真索引 I3 — 后端落地 + 接线** (提交 bc78ccb3 + 85e24875): de-risk 通过 (见上块); 行级 `SqliteSnapshotStore implements SnapshotStore` (drop-in 替 JSON T1 垫脚石) — schema `asset(id PK/source_key/ord/payload_json)` + `snapshot_meta(envelope)` + `user_version` 版本化 (不匹配 purge 重建, 镜像 parser_version 策略); `Database` 句柄注入 (结构化接口零 cast); `stripRaw` 提为两后端共享; main `index.ts` 注入真实 better-sqlite3 (runtime + 全单测零改, 只认 `SnapshotStore` 抽象)。tests: ✅ 6 单测 (fake Database 绕 ABI: 空/round-trip+顺序+stripRaw/source_key 落列/重存全替换/version 重建/懒打开单例) + `snapshot-persistence.e2e` 改 SQLite (打包主进程 open DB 端到端) + project-scope/global-shallow e2e 绿 + 全量 828 + typecheck(node+web) + lint。老用户 JSON→SQLite 迁移记 issue 2026-06-08-IMPROVEMENT-json-to-sqlite-snapshot-migration。
  - [x] **实时增量写 I1 — 约定文件端到端** (提交 53d88564 + 46a16e18 + 800e1944): `runtime.applyFileChange(sourceKey, derived)` 按归一 sourceKey 折叠 (复用 `mergeSharedConventions`, 重算 stats/assetMap, snapshot.id 稳定, 持久化 + emit partial); `deriveAssetsForPath` 约定文件派发 (CLAUDE.md/AGENTS.md/CLAUDE.local.md, scope path-containment 推断, AGENTS.md 产双适配器版本由 merge 折叠); watcher `WatchEvent.filePath` + `applyWatchEvent` 接线 (退役 `assets:changed`, renderer 经 progress 通道收增量, 避免 onChanged→refresh(force) 抵消)。约定文件改 → 仅重派生该文件、不全量重扫; 其它类型 fallback 全量 (等价现状)。tests: 切片1 7 + 切片2 6 + 切片3 4 单测 + watcher filePath; 全量 845 + typecheck(node+web) + lint + build 绿。
  - 余 (issue 2026-06-08-IMPROVEMENT-incremental-write-followups) 拆为可验切片:
  - [x] **cap-0 能力 parser sourceKey 地基** (explore 发现的前置阻塞): claude (skill/agent/command/output-mode/mcp/hook/permission/env/statusline) + codex (config/customAgent/hooksJson/skill) parser 出口经 `stampSourceKey`/`stampSourceKeys` (新 `src/main/adapters/source-key.ts`) 统一注入 `meta.sourceKey = dedupePathKey(asset.path)` — 基于 asset 自身 path, 故单文件多资产共享一 key、sidecar hook 按 entry.sourcePath 自洽。**改为不 bump 持久化 version**: cap-0 阶段能力文件仍走 fallback 全量, sourceKey 尚未被增量折叠消费, bump 无收益且牺牲 T1 SWR 冷启; stale 快照参与折叠的窗口留到 cap-1 引入能力文件折叠时用 restore-stamp 处理。tests: ✅ parser-identity +4 / codex-config +1 (每能力 asset sourceKey===dedupePathKey(path)); 全量 851 + typecheck(node+web) + lint + global-shallow e2e 绿。project-scope e2e 红经 stash+rebuild baseline 对比确认是**既有 macOS 平台问题** (非 cap-0) → issue `2026-06-08-BUG-project-scope-e2e-macos` + friction `20260608-3.0-implement-e2e-build-artifact-stale-platform-baseline`。
  - [x] **cap-1 deriveAssetsForPath 单文件多资产**: `CAPABILITY_FILE_DISPATCH` 按归一 path suffix 匹配 `.mcp.json`/`.claude/settings(.local).json`/`.codex/config.toml`/`.codex/hooks.json` (basename 歧义故按尾路径, win32 大小写折叠); settings.json 走 `settingsCapabilities` 组合 (mcp+hooks+permission+env+statusline), scope 走 inferScope (project/user; enterprise 留 cap-3); 复用 cap-0 带 sourceKey 的 parser, 按 sourceKey 整体替换。watch-wiring 行为更新: settings.json 现走增量、glob 类 (skill) 仍 fallback 全量。tests: ✅ derive-asset +5 / watch-wiring +1; 全量 856 + typecheck + lint + global-shallow e2e + build 绿。
  - [x] **cap-2 deriveAssetsForPath glob 类单资产** (提交 a2b189e2): `CAPABILITY_GLOB_DISPATCH` 按"能力目录段 + 文件名/扩展名"匹配 (能力目录互斥, 至多命中一项) — skill (.claude/skills/**/SKILL.md) / agent (.claude/agents/*.md) / command (.claude/commands/*.md) / output-mode (.claude/output-styles/*.md) / codex skill (.agents/skills/**/SKILL.md) / codex customAgent (.codex/agents/*.toml); 复用 cap-0 带 sourceKey 的单资产 parser, scope 走 inferScope。watch-wiring: glob 类现走增量, 仅 session/plugin/enterprise/sidecar 仍 fallback 全量。tests: ✅ derive-asset +5 + watch-wiring glob 增量; 全量 859 + typecheck(node+web) + lint + build + global-shallow/project-scope e2e 绿。
  - [x] **cap-3 剩余类型 scope** (提交 dc364998): enterprise (managed-settings.json → settingsCapabilities / managed-mcp.json → parseMcpServers, scope 固定 'enterprise', `ENTERPRISE_DISPATCH` 按 basename 派发走增量); **plugin guard** (plugin 组件文件 `~/.claude/plugins/{cache,data}/...` → null fallback, 修正 cap-1 潜在 bug — plugin 的 `.mcp.json` 被 `.mcp.json` suffix 误匹配为无 `pluginId` 的普通 mcp, 增量替换会覆盖带 pluginId 的 plugin-mcp; 全量扫描 descendPluginComponents 保留 tagging); sidecar (.berth/hooks-state.json 已 null→fallback 全量, 依赖图增量留 T4, 加确认测试)。tests: ✅ derive-asset +4 (enterprise×2 + plugin-guard + sidecar); 全量 863 + typecheck(node+web) + lint + build + global-shallow/project-scope e2e 绿。
  - [x] **cap-4 真实 e2e + health regression 修复** (提交 d7dd5237 + 08c39030): ① **真实 chokidar e2e** (`incremental-watch.e2e`: session-derived activate temp project → watcher restart 监听 .agents/skills → 真实新增 SKILL.md → chokidar 'add' → applyWatchEvent → applyFileChange → snapshot 多 skill + **snapshot.id 稳定**证明走增量非全量); ② **health regression 修复** — cap-3 退役 assets:changed 时遗漏 health hook 的 onChanged 消费者, 致 health checks 不随文件变更刷新 (功能退化); 恢复 main 推 assets:changed + health onChanged 改 `force:false` 软刷新 (用增量后 snapshot 重算, selectorCache 已被 applyFileChange 清空故重算反映新 assets, 不全量、不抵消增量), 主 asset syncSnapshot 兜底随之恢复。**原"删除 onChanged dead 订阅"计划被否定** — onChanged 非 dead, 是有用消费者, cap-3 错误切断了信号源。tests: e2e×3 + use-health-checks 软刷新断言; 全量 863 + typecheck(node+web) + lint + build 绿。
  - [ ] **cap-5 行级 SQLite delta** (低优先级, issue #4): applyFileChange 持久化走 `SqliteSnapshotStore.replaceBySourceKey` (DELETE WHERE source_key=? + INSERT) 替代全量 save。DB 全量写本就廉价 (几 ms), 真正价值 (避免全量重扫 FS) 已由 cap-0~4 兑现, 故降级。
  - [ ] **T4 后置 (实测驱动)**: worker parse→changeset→main 单 writer (背压); sidecar 依赖图; parse-error 保留旧行 `source_status=error`; 单调 checkpoint。
- [~] **T3 全局后台 + 纯过滤 + 完成度** (用户选 option-1, 部分落地)
  - [x] **全局=全部能力** (提交 4a17c54a): `scanProjectCapabilities` 后台索引非活动项目全部能力 (skill/agent/command/output-style/mcp/hook/permission/env/statusline), owner-tag; T3a 谓词 global 全显/project 过滤。**性能**: per-file 指纹缓存 (AssetFileCache<Asset[]>) worker↔main 往返, 跳过未变配置。tests: 单测 + e2e (global 命中其它项目 skill, 切项目过滤)。issue conventions-only RESOLVED。
  - [ ] 余: setProjectDir→纯过滤统一谓词 (search 已统一, sessions/health/usage 待核); per-root 完成度状态 (空态不误导); 设备级统一 watcher; 删/降级 scanShallowConventions (现与 capabilities 并存, 待全量索引稳定后收敛)。
- [ ] **T4 后置 (实测规模驱动)**: delta partial / session byte-offset tail / FTS5 / SAB 取消 / AIMD / 长驻 worker 池 / 丰富 knob + 暂停-恢复 UI + 性能档位设置。

## 并行/顺序
- T1 (parsers + engine scanner + agent-view) 文件独立于后续 scope 收敛 → 先落, 即时可见。
- T2 必须在 T3 之前 (浅索引把多项目放进 snapshot, 搜索过滤须先收敛, 否则项目搜索串项目)。
- T3→T4→T5 顺序依赖 (浅扫存在 → 升级 → 回归)。
- 各 Tier 内小步提交, 每次只暂存自己文件 + `git diff --cached` 核对。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
