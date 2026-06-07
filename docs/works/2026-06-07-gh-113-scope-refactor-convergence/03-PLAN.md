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

- [ ] **T3 resolveScanPlan + 后台浅索引 worker** (global=全设备, A2/A3/B①)
  - 改动: 新增 `resolveScanPlan {activeProject{dir,roots,depth:'deep'}, shallowProjects[{dir,depth:'shallow'}]}` (真分支, 不复用 projectDirs); 独立低优先级一次性 shallow worker (concurrency=1, mtime 缓存), 首轮前台深扫完成后启动; 浅扫仅根级 conventions (不走 `**/CLAUDE.md` 嵌套 glob, 不扫全部 .claude/.codex); 资产标 `meta.scanDepth='shallow'`; 结果 merge 进 snapshot, 不覆盖活动项目深扫态。
  - 并入 (从 T2 推迟): 全局快照含多项目项目级资产后, 项目级资产的**归属过滤**收敛到 shared 真源 (按 dedupeKey/projectPath/roots 判定 owner, 含 `.git` 继承链), `searchScopeAllows` 与列表 `filterAssetsByAppScope` 对项目级资产统一; 替换 T2 的 session-only 临时过滤。
  - tests: shallow plan 只含根级 conventions (无 skills/agents/commands/深层 CLAUDE.md); 后台 worker 不替换活动 snapshot; global 过滤含多项目浅约定; **project 模式不串其它项目的项目级资产** (含继承链正确归属); 本地 project-scope.e2e 绿。
  - verify: 不适用 (worker/引擎); scope/search 改动按 friction 20260606 硬门禁本地跑 project-scope.e2e。

- [ ] **T4 shallow→deep 无缝升级 + 稳定 key** (A4/B②)
  - 改动: CLAUDE.md 等浅扫 conventions 也带 `dedupeKey` 稳定 key, `deep wins` 覆盖 shallow; switcher 顺序改为先保留 shallow 行显示再 `activateProjectScope` 深扫 (project-scope-switcher.tsx:121-128), deep 完成按稳定 key 替换。
  - tests: 选中 shallow 项目→先显示浅行+刷新中→deep 完成按 key 替换无重复; 切项目不闪双行。
  - verify: 项目切换交互 (loading/无闪烁/秒级显示浅数据)。

- [ ] **T5 状态/UI/回归 + 视觉验收** (A6)
  - 改动: 若需暴露 shallow 状态, 用 `meta.scanDepth`+`reason` (不半写 `stale` 入 `ScanSourceStatus`); 失效项目标 missing 不扫。
  - tests: 全量回归 (列表/搜索/relations/raw view/Windows 大小写); `pnpm test` + scan-engine + build + harness:check 全绿。
  - verify: electron 实测窗口坐标裁剪截图 — 全局/用户/项目三档约定列表 + 项目切换浅→深; 灰底蓝字 tag 等既有视觉规范不回退。

## 并行/顺序
- T1 (parsers + engine scanner + agent-view) 文件独立于后续 scope 收敛 → 先落, 即时可见。
- T2 必须在 T3 之前 (浅索引把多项目放进 snapshot, 搜索过滤须先收敛, 否则项目搜索串项目)。
- T3→T4→T5 顺序依赖 (浅扫存在 → 升级 → 回归)。
- 各 Tier 内小步提交, 每次只暂存自己文件 + `git diff --cached` 核对。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
