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

- [ ] **T2 scope/search 谓词收敛到 shared 真源** (地基, 必须早于浅扫 — A5)
  - 改动: 删 main 重复项目过滤实现, 统一 `src/shared/scope.ts` `assetMatchesProjectPath`; `searchScopeAllows` (runtime.ts:97-100,270-278) 与 `filterAssetsByAppScope` 统一谓词。
  - tests: project 模式搜索只命中选中项目资产 (不串项目); 三档语义回归 (scope.test 扩展)。
  - verify: 不适用。

- [ ] **T3 resolveScanPlan + 后台浅索引 worker** (global=全设备, A2/A3/B①)
  - 改动: 新增 `resolveScanPlan {activeProject{dir,roots,depth:'deep'}, shallowProjects[{dir,depth:'shallow'}]}` (真分支, 不复用 projectDirs); 独立低优先级一次性 shallow worker (concurrency=1, mtime 缓存), 首轮前台深扫完成后启动; 浅扫仅根级 conventions (不走 `**/CLAUDE.md` 嵌套 glob, 不扫全部 .claude/.codex); 资产标 `meta.scanDepth='shallow'`; 结果 merge 进 snapshot, 不覆盖活动项目深扫态。
  - tests: shallow plan 只含根级 conventions (无 skills/agents/commands/深层 CLAUDE.md); 后台 worker 不替换活动 snapshot; global 过滤含多项目浅约定。
  - verify: 不适用 (worker/引擎)。

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
