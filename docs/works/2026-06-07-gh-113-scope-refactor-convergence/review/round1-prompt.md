你是资深 Electron/TypeScript 架构审查专家, 对 berth 的 **scope 特性重构设计** 做第一轮**对抗式 review**。抱怀疑态度找设计缺陷、漏洞、性能与正确性风险。

## 约束
- **禁止联网/web search** (官方语义已由我核验, 见下)。只读仓库代码验证设计可行性。
- 用 grep/跳读定位, 不要逐字通读全部文件 (上轮经验: 全读+联网会耗尽上下文)。
- 输出严格简洁中文。

## 已核验的官方语义 (你不必查)
- CLAUDE.md = Claude Code 专属, 项目级+用户级可加性叠加。
- AGENTS.md = 跨 agent 开放标准 (Codex/Cursor/Copilot/Claude Code 都读), 同一物理文件被两适配器都扫 → 重复是身份问题。

## 现状关键锚点 (核实用)
- 引擎只扫单一 projectDir: `src/main/engine/scanner.ts:47-54`, `src/main/agent-plugins/adapter-registry.ts:31-39`, `src/main/project-dir.ts:6-8`。
- 项目继承链: `src/main/project-config-roots.ts:4-25`; claude `projectDirsFromContext`/`scanInstructions` 逐 projectDirs 扫项目级 + 深层 `**/CLAUDE.md` 嵌套 glob (`src/main/adapters/claude-code/scanner.ts` ~98-160,441-444)。
- 会话派生项目: `src/main/project-scope.ts:17-42`, `scanner.ts withProjectSourceCandidates:212-235` (status not-scanned, 从不真扫)。
- 重复根因: claude `parseAgentsMd` (id=makeId 非确定, agentId=claude-code) vs codex `parseCodexAgentsMd` (id=hash, agentId=codex), `src/main/adapters/claude-code/parsers.ts:38-51`, `src/main/adapters/codex/parsers.ts:76-89`。claude `seenConventions` 仅适配器内 (`scanner.ts:109-141`); codex 无。`annotateEquivalentHookSources` 按 agentId+hash 聚合留双份 (`engine/scanner.ts:280-308`)。
- 过滤: shared `assetMatchesAppScope`/`filterAssetsByAppScope` (`src/shared/scope.ts:78-90`); 渲染 `filterAssetsByAgentView` (`src/renderer/src/lib/agent-view.ts:9-11`); 主进程 `searchScopeAllows` (`src/main/engine/assets/runtime.ts:97-100`)。

## 我的设计草案 (你要对抗的)
**D1 多项目扫描 (global=所有项目)**: worker 一趟: ①扫用户级(含 sessions); ②派生项目集=当前项目∪session.projectPath, 过滤不存在的; ③逐项目扫项目级 (conventions+.claude/.codex 配置); ④去重→聚合。性能边界: 深层 `**/CLAUDE.md` 嵌套 glob **只对当前活动项目**, 非活动项目只浅扫根+.claude。低侵入实现: 把 adapter 的 `this.projectDirs` 从"当前项目链"扩为"所有派生项目根+当前项目完整链"。runtime 不再 per-project 重扫; project 切换走纯过滤。
**D2 去重**: 引擎层后处理 `dedupeByPhysicalPath`: 按 normalizePath(path)+type 合并; 跨 agent 共享文件 (AGENTS.md/~/.agents/skills) 合一条, meta.agents=[...], 规范 agentId='shared' 或保留首个+meta.agents。agentView 改为命中 meta.agents 也算可见 (shared 在两视图都显)。
**D3 收敛**: shared/scope.ts 仍是过滤真源 (语义不变); 删 main `filterAssetsByProjectPath` 重复实现; 新增 `resolveScanProjectDirs`; searchScopeAllows 与 filterAssetsByAppScope 统一。
**D4 用户域**: user=user/enterprise 核对无 project 泄漏。

## 你要回答 (对抗式, 给 file:line + 具体理由)
A. 这套设计**最大的 3 个风险/缺陷**是什么? (性能/正确性/架构/可维护)
B. 逐一回答开放问题:
  - Q1 多项目 global 性能上界 (派生项目几十个, 即便浅扫累计开销)? 是否需惰性/后台/增量, 还是同步可接受?
  - Q2 去重规范 agentId: 引入 'shared' agentId 的影响面 (类型/agentView/icon/i18n/relations) vs 保留首个+meta.agents, 哪个更稳? 为什么?
  - Q3 project 切换从重扫改纯过滤: 非活动项目未深扫嵌套 CLAUDE.md → 切到该项目时其嵌套约定缺失, 必须切换时补深扫吗? 还是接受?
  - Q4 去重合并对 relations/插件归属/equivalentSources/health-check 的影响?
  - Q5 会话派生 projectPath 存在性检查 (existsSync×N) 开销 + 失效项目处理?
C. 有没有我**没想到的更优/更简方案** (尤其去重与多项目扫描的架构)?
格式: A/B/C 三段; A 用 `#N [风险][严重度][置信度] 标题—file:line—问题—建议`。
