A.
#1 [正确性][高][高] `path+type` 去重会误删多实体—`src/main/adapters/claude-code/parsers.ts:198-208`, `src/main/adapters/codex/parsers.ts:123-135`, `src/main/adapters/codex/parsers.ts:183-208`—同一个配置文件可产出多个 `mcp-server` / `hook`，它们 `path` 和 `type` 相同但语义不同。通用 `dedupeByPhysicalPath` 会只留一条，MCP、Hook、relations 都会错。建议只对白名单类型去重，例如 `agents-md`，并要求 `path+type+rawHash` 或显式 `dedupeKey`。

#2 [架构/性能][高][高] 扩大 `projectDirs` 不是低侵入—`src/main/adapters/claude-code/scanner.ts:146-217`, `src/main/adapters/codex/index.ts:204-240`—`projectDirs` 现在不只扫项目根指令，还驱动 `.claude/skills`、agents、commands、MCP、settings、`.codex`、`.agents/skills`。把它扩成几十个 session 项目，会把大量项目级能力一起扫进来，并且非活动项目若只放 leaf path，还会漏掉 `resolveProjectConfigRoots` 的仓库继承链（`src/main/project-config-roots.ts:4-24`）。建议新增 `ScanPlan { projectDir, roots, depth }`，不要复用 `projectDirs` 表达“所有项目”。

#3 [正确性][高][中] 纯过滤切换会让项目视图不完整—`src/main/project-scope-runtime.ts:34-45`, `src/main/engine/assets/runtime.ts:281-287`, `src/main/engine/watcher.ts:89-95`—当前切项目会换 scanner、刷新、重启 watcher；health check 只拿 `snapshot.projectDir` 检查一个项目。若改成纯过滤，而非活动项目又未深扫 nested `CLAUDE.md`（`src/main/adapters/claude-code/scanner.ts:128-135`），切过去后指令、health、watch 更新都会缺数据。建议项目选择时仍补一次深扫；global 可以展示浅扫结果，但必须标明 `scanDepth=shallow`。

B.
Q1：几十个项目同步扫不稳。`existsSync` 本身不是主问题，递归目录和配置解析才是。前台只扫用户级 + 活动项目深扫；session 派生项目做后台浅扫、限流、缓存 mtime。网络盘/不存在路径要快速跳过。

Q2：不要引入 `agentId='shared'`。`AgentView` 只有 `all|claude|codex`（`src/shared/types/asset.ts:10`），health check 也只有 `all|claude-code|codex`（`src/shared/types/ipc.ts:228-233`），UI 多处直接二分 agentId（如 `src/renderer/src/lib/agent-view.ts:3-10`）。更稳是保留确定的主 `agentId`，加 `meta.agents` / `readByAgentIds`，所有视图判断走 helper。

Q3：必须补深扫。否则选中项目视图不是“该项目真实资产”，只是 global 浅索引的切片。可以先展示浅数据，再触发深扫并显示刷新中；不能静默接受缺 nested `CLAUDE.md`。

Q4：relations 依赖 asset id 和 path 匹配（`src/main/engine/relations.ts:10-24`），去重后要保留 alias id 或重建引用；插件归属用 `meta.pluginId`（`src/main/engine/relations.ts:57-62`），不要合并插件组件；`equivalentSources` 现在按 `agentId:scenarioHash:hookHash`（`src/main/engine/scanner.ts:280-313`），不能被 shared agentId 改写；health 不应消费 `shared` agentId。

Q5：`existsSync × N` 在本地几十个可接受，在 worker 内做即可。先 normalize/dedupe，再 `stat` 确认是目录。失效项目不要从候选列表直接消失：保留为历史 session 来源，标 `missing/stale`，只是不参与项目资产扫描。

C.
更简方案：保留当前“活动项目深扫 + per-project snapshot cache”。global 不变成一次性全项目深扫，而是“用户级资产 + sessions + 已缓存项目快照 + 后台浅索引”。切项目继续走 `activateProjectScope` 深扫和 watcher 重启。去重只在 instruction 层做：给 `AGENTS.md` 这类物理共享文件生成显式 `dedupeKey`，合并为一条资产并记录 `readByAgentIds`；不要在引擎层按 `path+type` 全局合并。

