# 技术方案 (Design 产物) — round-1 后修订 (Codex 交叉 review)

> **R1 修订记录**: Codex round-1 推翻初稿三处 (path+type 去重误删多实体 settings.json 的 hooks/mcp; projectDirs 过载破坏继承链+性能; 纯过滤切换丢深扫数据); 我核验全部确认, 采纳 Codex 更简架构 (global=用户+sessions+缓存快照+**后台浅索引**; 去重仅指令层 dedupeKey+readByAgentIds, 不引入 agentId='shared')。下为修订设计。原始 review: `review/round1-codex.md`。

## 终版设计 (R2 终核 — Codex round-2 已确认)

> round-2 确认 R-D1/D2/D3 架构成立, 但给出 7 项必须遵守的实现约束 (A1-A7)、3 个开放问题答案 (B①②③)、最小增量收窄 (C) 与实施顺序 (D)。原始 review: `review/round2-codex.md`。

### R2-A 实现约束 (落地不变量)
- **A1 稳定 canonical id (T1 必须先解决)**: claude `parseAgentsMd` 用 `makeId()` 含 `Date.now()` → 每次扫描 id 抖动。合并主记录选 claude-code 可以, 但**不能保留 claude 的非确定 id**。`runtime.ts:161-162` / `view-raw-button.tsx:13-15` / `instructions.tsx:512` 都把 id 当不透明句柄消费, id 抖动会导致刷新后选中丢失 + raw 重取失败。→ T1 把 claude AGENTS.md id 改为**确定式** (`agents-md-${scope}-${hash(dedupeKey)}`, 镜像 codex 方案), 合并保留主记录确定 id。
- **A2 `resolveScanPlan` 必须是真分支, 不是 projectDirs 改名 (T3)**: `projectDirs` 现在驱动深层 `**/CLAUDE.md` + skills/agents/commands/settings/mcp/.codex 全量深扫 (claude scanner.ts:120-193, codex index.ts:204-240)。把几十个 session 项目塞进 `projectDirs` 会触发全部深扫并漏掉 `resolveProjectConfigRoots` 继承链。浅扫需独立 `ScanPlan{ activeProject{dir,roots,depth:deep}, shallowProjects[{dir,depth:shallow}] }`。
- **A3 后台浅扫不走普通 refresh/partial (T2)**: 现 worker 一次性全扫 (worker-host.ts:57-58, worker.ts:10-20), partial 直接替换页面资产 (runtime.ts:436-443)。浅扫需**独立低优先级一次性 worker 队列 (concurrency=1) + mtime 缓存**, 结果 merge 进 snapshot, 不得覆盖活动项目深扫态。
- **A4 shallow→deep 闪烁不止 AGENTS.md (T4)**: `parseClaudeMd` 的 CLAUDE.md id 同样非确定 (parsers.ts:22-33)。浅扫根级 conventions 后切项目深扫会生成另一批 id, 列表 key/详情读取都会跳 → 需 `dedupeKey + deep wins` 稳定 key。
- **A5 scope/search 收敛必须早于 T2**: `searchScopeAllows` (runtime.ts:97-100,270-278) 对 project/global 都放行; 浅索引把多项目资产放进 snapshot 后, project 搜索必须复用 `src/shared/scope.ts:78-89` 项目过滤, 否则项目搜索串到别的项目。→ T2 之前先收敛 (调整原分层: 收敛提前)。
- **A6 `missing/stale/shallow` 类型/UI 暂不支持**: `ScanSourceStatus` 只有 `scanned|missing|not-scanned` (asset.ts:14); switcher 也只认这三 (project-scope-switcher.tsx:22,556-563)。**不半写一个 `stale`** — shallow 放 `meta.scanDepth` + `reason`, 需要时再扩类型与文案。
- **A7 `~/.agents/skills` 不进 dedupe**: codex 已扫 (codex/index.ts:202), health 按 codex 路径推断 (health.ts:239-242,1409-1411)。要 claude 视图可见**只加 `readByAgentIds`, 不按 path/type 合并 skill/plugin component**。T1 暂不动 skills。

### R2-B 开放问题答案
- **B① 触发时机/worker 模型**: 首轮前台深扫完成后**启动后台浅扫任务** (非首扫抢资源, 非仅切 global 惰性)。独立一次性 shallow worker, concurrency=1, 加 mtime/cache; 不复用普通 refresh 的 partial 写法。
- **B② shallow→deep 无缝升级**: 选中 shallow 项目时**先保留现有 snapshot**, 让过滤后的 shallow 行继续显示, 再启动 `activateProjectScope` 深扫; deep 完成后按稳定 key 替换 shallow。需调整 switcher 顺序 (project-scope-switcher.tsx:121-128 当前等 activate 完才 setScopeSelection)。
- **B③ relations/import-chain 无需重指向**: `assets:import-chain` 是 filePath 输入 (handlers.ts:163-164), 按路径建树, 不涉 id。`assets:relations` 从 `allAssets` 找 target 并返回 `target.id` (relations.ts:17-21), **只要 merge 在 cache 前完成, 关系自然指向合并后主 id** — 无需改 relations 代码。

### R2-C T1 收窄 (最小可独立落地增量)
**只处理 AGENTS.md 指令合并 + agent view 可见性; 不碰 shallow / 全局 scope / health。**

精确改动点:
- `src/main/adapters/claude-code/parsers.ts` `parseAgentsMd`: 加 `meta.dedupeKey` + `meta.readByAgentIds=['claude-code']` + **确定式 id** (A1)。
- `src/main/adapters/codex/parsers.ts` `parseCodexAgentsMd`: 加 `meta.dedupeKey` + `meta.readByAgentIds=['codex']` (id 已确定式)。
- `src/main/engine/scanner.ts`: 新增**纯函数** `mergeSharedConventions(assets): Asset[]`, 放在 `annotateEquivalentHookSources`/cache/stats 之前; **partial 分支 (scanner.ts:94-98) 也走同一 merge** (避免扫描中短暂双行)。仅对带 `dedupeKey` 者按 key 分组合并, 主 agentId claude-code 优先, 并集 readByAgentIds, 保留主记录确定 id 与 dedupeKey (幂等)。
- `src/renderer/src/lib/agent-view.ts`: 新增 `assetMatchesAgentView(asset, view)` 读 `meta.readByAgentIds`; `filterAssetsByAgentView` 改走它; 保留 `matchesAgentView(agentId, view)` 向后兼容。
- 暂不改 health / hook / mcp / equivalentSources / skills。

T1 测试要点 (TDD):
1. 同一路径 AGENTS.md 被 claude+codex 扫到 → 合并后**仅一条**, `readByAgentIds` 为并集 `['claude-code','codex']`。
2. 合并后 claude / codex / all 三视图都可见该条。
3. 同一路径 `settings.json` 的多 hook/mcp **不被误合并** (无 dedupeKey)。
4. `CLAUDE.md @AGENTS.md` 的 relation target 指向合并后的 id (merge 在 cache 前)。
5. plugin component / skill **不因 path/type 被合并**。
6. **id 跨两次扫描稳定** (确定式), 且 Windows 路径大小写不同仍归一为同一 dedupeKey。

### R2-D 实施顺序 (每层最易踩的坑)
1. **T1 AGENTS.md 合并** — 坑: 把 `agentId=claude-code` 等同保留 claude id 致 id 抖动; 只处理 final 不处理 partial 致扫描时闪双行。
2. **scope/search 收敛到 shared predicate** (提前到 T2 之前, A5) — 坑: 以为只是 UI 过滤, 漏掉 runtime.ts:97-100,270-278 搜索过滤。
3. **`resolveScanPlan` + shallow worker** (A2/A3/B①) — 坑: 复用 projectDirs 触发深扫; 后台 worker 走普通 refresh 替换当前 snapshot。
4. **shallow→deep 升级** (A4/B②) — 坑: 无稳定 key deep 盖不住 shallow; 切换 UI 等 deep 完才切 scope, 看不到已有 shallow。
5. **状态/UI/回归** (A6) — 坑: 代码出现 `stale/shallow` 但类型/switcher 仍只认三态; 测试只测列表, 漏搜索/relations/raw view/Windows 大小写。

---

## 修订设计 (R1 后 — 背景, R2 已细化为上方终版)

### R-D1 去重 (即时可见修复 — 用户截图问题)
- **指令层** (非引擎层全局): 给物理共享文件显式 `dedupeKey`。AGENTS.md 解析时 (claude `parseAgentsMd` / codex `parseCodexAgentsMd`) 产出资产带 `meta.dedupeKey = normalizePath(path)`、`meta.readByAgentIds=[本 agent]`。
- 引擎层后处理 `mergeSharedConventions(assets)`: **仅对带 dedupeKey 的资产** 按 dedupeKey 分组合并为单一资产; 保留**确定的主 agentId** (约定 claude-code 优先), 合并 `meta.readByAgentIds` 并集。**不**按 path+type 全局去重 (settings.json 的多 hook/mcp 必须各留)。
- agentView: 新增 helper `assetMatchesAgentView(asset, view)` = `view==='all' || agentId 命中 || meta.readByAgentIds 含映射 agentId`; `filterAssetsByAgentView` 改走 helper。shared AGENTS.md 在 claude/codex 视图都可见, all 单条。
- 不引入 `agentId='shared'` (AgentView/health/icon/relations 多处二分 agentId, 影响面过大)。审计 ~/.agents/skills (codex 单边扫) → claude 也标 readByAgentIds 或同 dedupe。

### R-D2 global=全设备资产 (后台浅索引, 非前台全深扫)
- **前台 (一次扫描)**: 用户级 + enterprise + sessions + **当前活动项目深扫** (现状)。
- **后台浅索引**: session 派生且**存在**的项目目录, 后台**浅扫**其根级 conventions (CLAUDE.md/AGENTS.md, **不**走深层 `**/CLAUDE.md` 嵌套 glob, **不**扫全部 .claude/.codex 配置), 限流 + mtime 缓存; 资产标 `meta.scanDepth='shallow'`。这满足"全局看到所有项目的约定"而开销可控。
- **scanDepth 标记**: 活动项目深扫资产 `scanDepth='deep'` (或不标); 浅索引 `scanDepth='shallow'`。UI 可提示"浅索引, 切到该项目查看完整"。
- **project 切换**: 仍走 `activateProjectScope` 深扫 + watcher 重启 (R1#3); 可先展示该项目浅数据 + 刷新中, 深扫完成替换。
- **失效项目**: 不从候选消失, 标 `missing/stale`, 不参与扫描 (R1 Q5)。
- 过滤谓词: global=全部 / user=user+enterprise / project=选中项目。global 现在含浅索引的多项目约定 → 满足语义。

### R-D3 收敛
- shared/scope.ts 仍为过滤真源; 删 main `filterAssetsByProjectPath` 重复实现, 统一 `assetMatchesProjectPath`; `searchScopeAllows` 与 `filterAssetsByAppScope` 统一谓词。
- 新增 `resolveScanPlan` (替代过载 projectDirs): `{ activeProject: {dir, roots, depth:'deep'}, shallowProjects: [{dir, depth:'shallow'}] }`, 供 scanner 分层扫描。
- 不变量: relations 用 asset id+path (去重保留主 id, 重建引用); 不合并插件组件 (meta.pluginId); equivalentSources 不被改写; health 不消费 shared agentId (R1 Q4)。

### R 实施分层
- **T1 去重** (即时可见): R-D1 (dedupeKey + mergeSharedConventions + agentView helper)。优先, 独立可验。
- **T2 global 浅索引**: R-D2 (resolveScanPlan + 后台浅扫 session 项目 conventions + scanDepth + runtime 聚合)。
- **T3 收敛 + project 切换深扫保障**: R-D3 + 切换补深扫 + 删重复 filter。
- **T4 回归 + 视觉验收 + Codex round-2 复核**。

### R 开放问题 (交 round-2)
- 浅索引的触发时机 (首扫后台 vs 惰性 on global-view) 与 worker 模型 (同 worker 续扫 vs 单独)?
- scanDepth='shallow' 资产在 project 模式被选中时如何无缝升级为 deep (避免闪烁/重复)?
- mergeSharedConventions 后 relations/import-chain (AGENTS.md 的 @import) 是否需重指向主 id?

---
# 原草案 (已被 R1 修订, 保留备查)


## 核心洞见
若 **global 把所有项目扫进快照**, 则三档语义只需现有过滤谓词几乎不变:
- global → 全部; user → user/enterprise; project → 过滤到所选项目 (+继承链)。
- **附带红利**: project 切换变成纯客户端过滤 (秒级), 不再重扫 (所有项目已在快照内)。
难点转移到**扫描**: 多项目两阶段 worker pass + 物理路径去重。

## D1 多项目扫描 (global=所有项目)
扫描流程 (worker 内一趟):
1. **用户级** (一次): claude `~/.claude` + codex `~/.codex` + enterprise → 用户资产 + **sessions**。
2. **派生项目集**: `currentProjectDir ∪ {session.meta.projectPath}`, 过滤掉**不存在**的目录, 归一化去重。
3. **项目级** (逐项目): 每个项目扫 conventions (CLAUDE.md/AGENTS.md) + `.claude`/`.codex` 配置 (settings hooks/mcp/env/statusline、.mcp.json、skills/commands/agents 目录)。
4. **去重** (见 D2) → 聚合进 snapshot。
- **性能边界**: 深层 `**/CLAUDE.md` 嵌套 glob **只对当前活动项目**执行 (它走整棵源码树); 非活动项目只扫根 + .claude 显式文件/目录, 不深挖。每项目读取量小 (几个配置文件 + 浅 glob)。
- **实现路径 (低侵入)**: adapter 的 `this.projectDirs` 已是**列表** (`projectDirsFromContext` 读 `ctx.projectDirs`); 把它从"当前项目 .git 链"扩展为"所有派生项目的根 (+当前项目的完整继承链)"。scanInstructions/scanCapabilities 已逐 projectDirs 扫项目级 → 自然覆盖所有项目。用户级 (ctx.claudeDir) 仍只扫一次。
- runtime: 不再 per-project 重扫; project 切换走 set-scope (纯过滤)。`snapshotCache`/`activateProjectScope` 重扫逻辑收敛/简化。

## D2 去重 (同一物理文件单条)
- **引擎层后处理** `dedupeByPhysicalPath(assets)` (在 annotateEquivalentHookSources 同级): 按 `normalizePath(asset.path)` + `type` 分组; 同组多资产合并为**单一规范资产**。
- **合并规则**: 
  - 跨 agent 共享文件 (AGENTS.md, ~/.agents/skills): 合并为一条, `meta.agents = ['claude-code','codex']` (去重的 agentId 集合), 规范 agentId 设为 `'shared'` (新增) 或保留首个 + meta.agents。
  - 同 agent 内同路径 (claude seenConventions 已处理的) 也由此层兜底统一。
- **agentView**: `filterAssetsByAgentView` 改为: asset 命中视图 = `agentId===view || (meta.agents 包含映射后的 agentId)`; shared 资产在 claude 与 codex 视图都可见, all 视图单条。
- 审计并纳入其它共享源 (~/.agents/skills 两边都应可见)。

## D3 收敛: 统一 scope 策略
- `src/shared/scope.ts` 仍是过滤真源 (assetMatchesAppScope/filterAssetsByAppScope), 语义保持 (global 全部 / user 公共 / project 选中)。删除 main `filterAssetsByProjectPath` 重复实现, 统一用 shared 的 `assetMatchesProjectPath`。
- 新增"扫描范围"概念 `resolveScanProjectDirs(currentDir, sessionProjects)` → 供 scanner 决定扫哪些项目 (与过滤分离但同模块文档化)。
- `searchScopeAllows` 与 `filterAssetsByAppScope` 统一为同一谓词 (消除分歧)。

## D4 用户域核对
- user = user/enterprise (现状基本符合"项目外公共"); 核对去重后无 project/session 泄漏到 user 视图。

## 开放问题 (交 Codex round-1 对抗)
- Q1 多项目 global 扫描的**性能上界**: 派生项目可能很多 (几十), 即便每项目浅扫, 累计 IO/worker 时间? 是否需惰性/后台/增量?
- Q2 去重的**规范 agentId**: 引入 `'shared'` agentId 影响面 (agentView/icon/i18n/类型)? 还是保留首个 agentId + meta.agents 更稳?
- Q3 project 切换从"重扫"改"纯过滤": 继承链/嵌套 CLAUDE.md 对非活动项目未深扫 → 切到某项目时其嵌套 CLAUDE.md 缺失, 是否需切换时对该项目补深扫?
- Q4 去重合并后 **relations/插件归属/equivalentSources** 是否受影响?
- Q5 会话派生 projectPath 的**存在性检查**开销 (fs.existsSync × N) 与失效项目清理。

## 测试矩阵 (草案)
| 项 | 测试 | 断言 |
|---|---|---|
| 多项目 global | tests/unit (engine 多 projectDir) | 多项目项目级资产聚合 |
| 去重 | tests/unit | 同物理 AGENTS.md 跨适配器→单条 + meta.agents 双 |
| agentView shared | tests/renderer | shared 资产 claude/codex 视图都可见 |
| project=过滤 | runtime/scope | project 模式过滤到选中项目 (不重扫) |
| 语义回归 | scope.test 扩展 | 三档语义 |
