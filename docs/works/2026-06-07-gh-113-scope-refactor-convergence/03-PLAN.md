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

## 并行/顺序
- T1 (parsers + engine scanner + agent-view) 文件独立于后续 scope 收敛 → 先落, 即时可见。
- T2 必须在 T3 之前 (浅索引把多项目放进 snapshot, 搜索过滤须先收敛, 否则项目搜索串项目)。
- T3→T4→T5 顺序依赖 (浅扫存在 → 升级 → 回归)。
- 各 Tier 内小步提交, 每次只暂存自己文件 + `git diff --cached` 核对。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
