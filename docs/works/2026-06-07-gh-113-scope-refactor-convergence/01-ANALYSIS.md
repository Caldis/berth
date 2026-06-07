# 需求分析 (Explore 产物)

Explore = Workflow 4 路并行只读探查 (scope-model / scan-roots / dedup / convergence) + 主 agent 官方文档核验。

## 官方语义 (已英文核验)
- **CLAUDE.md** — Claude Code 专属; 项目级 + 用户级 (~/.claude) **可加性叠加** (都生效), 企业/managed 最高优先。(code.claude.com/docs/en/memory)
- **AGENTS.md** — **跨 agent 开放标准** (Agentic AI Foundation/Linux Foundation), 被 Codex/Cursor/Copilot/**Claude Code**/Aider 共同读取。Codex 链: `~/.codex/AGENTS.override.md`→`AGENTS.md`, 再从 git root 向 cwd 逐目录。(agents.md, developers.openai.com/codex/guides/agents-md)
- **结论**: AGENTS.md 是共享物理文件, 两适配器都"应该"读 → 重复是身份/去重问题, 非"哪个适配器不该扫"。可加性叠加 → "全局=聚合一切"语义正确。

## 现状 (已核实)

### A. scope 数据模型 (shared/scope.ts)
- `AppScopeSelection` = {global} | {user} | {project, projectPath, projectPathKey}; 默认 global。
- `assetMatchesAppScope`: global→true; user→仅 user/enterprise; project→user/enterprise + projectPath 匹配。`scope.ts:78-86`。
- 过滤两层: 渲染 `filterAssetsByAppScope` (instructions:455/capabilities:943/overview) + 主进程 `searchScopeAllows` (runtime:97-100, 仅 search)。

### B. "global ≠ 所有项目" 根因 (架构)
- 引擎只扫**单一 projectDir**: `resolveDefaultProjectDir`(prod=cwd/dev=undefined)→`AssetScanner(projectDir)`→`createAgentAdapters(projectDir)`→每适配器 `resolveProjectConfigRoots(projectDir)`(仅当前 .git 链)。`project-dir.ts:6-8`,`scanner.ts:47-54`,`adapter-registry.ts:31-39`。
- 快照来自这一个项目; global 只是不过滤展示它。
- 会话派生项目: `projectScopeCandidatesFromAssets`(session.meta.projectPath)→候选, `withProjectSourceCandidates` 以 `status:'not-scanned'` 列出但**从不真正扫描**。`project-scope.ts:17-42`,`scanner.ts:212-235`。

### C. 重复扫描根因 (身份)
- 同一物理 `AGENTS.md` 两适配器各产一资产: claude `parseAgentsMd` id=`makeId`(非确定)+agentId=claude-code; codex `parseCodexAgentsMd` id=`codex-agents-md-${scope}-${hash}`+agentId=codex。同路径→不同 id/agentId→现有去重抓不到。`parsers.ts:38-51`,`codex/parsers.ts:76-89`。
- 现有去重仅**适配器内**: claude `seenConventions`; codex 无。`scanner.ts:109-141`。
- `~/.agents/skills` 仅 codex 扫。`codex/index.ts:202`。
- `annotateEquivalentHookSources` 按 `agentId:scenarioHash:hookHash` 聚合(含 agentId→跨适配器不合并, 留双份)。可借鉴不直接复用。`scanner.ts:280-308`。
- `filterAssetsByAgentView` 仅 UI 层 (view=all 双份都显)。`agent-view.ts:9-11`。

### D. 收敛面
- shared `scope.ts`; main runtime scopeSelection/searchScopeAllows + project-scope.ts + project-scope-runtime.ts + handlers + project-config-roots/project-dir; renderer store/switcher/pages filterAssetsByAppScope/agent-view。
- 关键: "扫哪些项目源"(范围) 与"展示哪些 asset"(过滤) 是两套逻辑未统一; `filterAssetsByProjectPath`(main) 与 `assetMatchesProjectPath`(shared) 部分重复。

### E. 测试 (回归网)
- 已有: scope.test.ts(shared 全覆盖)/project-scope.test.ts/project-scope-runtime.test.ts/agent-asset-runtime.test.ts/app-store.test.ts。
- 缺口: 页面级 filter / 跨适配器去重 / 多项目 global 无测试。

## 核心设计挑战 (交 Design + Codex 两轮 review)
1. **global=所有项目**: 引擎扫"已知且仍存在"的所有项目的**项目级**资产 (CLAUDE.md/AGENTS.md/.claude|.codex 配置 — 轻量; sessions/用户级只扫一次), 聚合+缓存。源=当前项目 + 会话派生 projectPath(仍存在)。性能: 每项目只读少量配置; 复用 per-project snapshotCache; 可后台/惰性。
2. **去重**: 后处理按**归一化物理路径**去重; 共享文件 (AGENTS.md) 合并单一资产, 跨 agent 归属 (meta.agents=[...] / agentId='shared'), agentView 在相关视图都可见。审计其它共享源 (~/.agents/skills)。
3. **收敛**: "作用域 = (扫哪些项目源)+(展示哪些 asset)"统一到一个 scope 策略模块, 消除 filter 双实现。
4. **用户域**: 现 user=user/enterprise 基本符合"项目外公共"; 核对无项目级泄漏。

## 测试策略
- shared scope: 三档语义单测; 去重: 同一物理 AGENTS.md 跨适配器→单资产+双 agent+两视图可见; 多项目 global: engine 单测 (多 projectDir→聚合+去重); 页面级过滤回归 + 现有 scope 测试不回归 + Codex 两轮 review。
