scope 重构对抗 review 第二轮。你上一轮推翻了我的初稿三处 (path+type 去重误删 settings.json 多 hook/mcp; projectDirs 过载; 纯过滤切换丢深扫)。我**全部确认并采纳你的更简架构**。下为修订设计, 请第二轮对抗。

## 约束: 禁联网; grep/跳读不全读; 简洁中文。

## 修订设计 (采纳你 round-1 的 C + Q 答案)
**R-D1 去重 (即时可见修复)**: 指令层, 非引擎全局。AGENTS.md 解析时带 `meta.dedupeKey=normalizePath(path)` + `meta.readByAgentIds=[本agent]`; 引擎后处理 `mergeSharedConventions` **仅对带 dedupeKey 者**按 dedupeKey 合并为单条, 保留**确定主 agentId** (claude-code 优先) + 并集 readByAgentIds; **不**按 path+type 全局去重。agentView 走新 helper `assetMatchesAgentView` (view=all || agentId 命中 || readByAgentIds 含)。**不**引入 agentId='shared'。审计 ~/.agents/skills。
**R-D2 global=全设备 (后台浅索引)**: 前台=用户级+enterprise+sessions+**活动项目深扫**(现状); 后台对 session 派生且存在的项目**浅扫根级 conventions** (不走深层 **/CLAUDE.md, 不扫全部 .claude/.codex), 限流+mtime 缓存, 标 `meta.scanDepth='shallow'`; project 切换仍 `activateProjectScope` 深扫+watcher; 失效项目标 missing/stale 不扫。过滤 global=全部/user=user+enterprise/project=选中。
**R-D3 收敛**: shared/scope.ts 为过滤真源; 删 main filterAssetsByProjectPath 重复; searchScopeAllows 与 filterAssetsByAppScope 统一; 新增 `resolveScanPlan {activeProject{dir,roots,depth:deep}, shallowProjects[{dir,depth:shallow}]}` 替代过载 projectDirs。不变量: relations 保主 id; 不合并插件组件; equivalentSources 不改写; health 不消费 shared。

## 实施分层
T1 去重 (即时可见, 独立可验) → T2 global 浅索引 → T3 收敛+切换补深扫 → T4 回归+round-2 复核。

## 你第二轮要做 (对抗式, file:line + 理由)
A. 对修订设计若仍有正确性/性能/架构缺陷, 指出 (尤其 R-D1 合并的主 agentId 选择、R-D2 后台浅扫的 worker 模型与触发时机、scanDepth shallow→deep 升级的闪烁/重复)。
B. 回答修订开放问题: ①浅索引触发时机 (首扫后台 vs 惰性 on global-view) 与 worker 模型 (同 worker 续扫 vs 独立)? ②shallow 资产被选中升级 deep 如何无缝 (避免重复/闪烁)? ③mergeSharedConventions 后 AGENTS.md 的 @import / import-chain (`src/main/adapters/claude-code/parsers.ts` extractAtImports + `assets:import-chain` handler) 是否需重指向主 id?
C. **最小可独立落地的第一个增量**是什么 (我打算先做 T1 去重)? T1 单独落地有无隐藏耦合 (relations/equivalentSources/health/agentView 测试)? 给 T1 的精确改动点 file:line 与测试要点。
D. 整体实施顺序与每层"最易踩的坑"。
格式: A/B/C/D 四段; A/D 用编号; 简洁。
