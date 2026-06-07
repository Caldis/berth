A. 裁决复核

基本同意。只补一个边界：#7 的升级成立，但范围应写准。`scanner.ts:501` 的 `statSync` 抛错会让 `ClaudeCodeAdapter.scanAll()` 这一轮中断，丢 Claude adapter 已扫/待扫资产；但外层 `AssetScanner.runScanAll()` 在 `src/main/engine/scanner.ts:76-87` 会 catch adapter 异常，所以不会拖垮 Codex 和其它 adapter。

B. 新 finding

#1 [watcher一致性][高][高] watcher 把自己要监听的点目录排除了 — `src/main/engine/watcher.ts:31-38,79-85` — watchPaths 明确加入 `.claude/.codex/.agents`，但 `ignored: /(^|[/\\])\../` 会匹配这些路径段 — 建议改成只忽略 `.git` 等明确目录，补 `.claude/settings.json` 变更触发测试。

#2 [项目切换][高][高] runtime 已切项目，legacy scanner 仍停在启动项目 — `src/main/project-scope-runtime.ts:38-45`, `src/main/ipc/handlers.ts:137-140,231-232`, `src/main/engine/scanner.ts:314-324` — 项目切换只更新 runtime/watcher；`assets:scan-category` 和 `hooks:statuses` 仍走旧 `getScanner()` — 建议删除 legacy scanner 读路径，统一从 runtime 当前项目取。

#3 [scope过滤][高][中] 子目录项目会隐藏父级实际生效配置 — `src/main/project-config-roots.ts:23-24`, `src/main/adapters/claude-code/scanner.ts:98-125`, `src/shared/scope.ts:71-75` — 扫描会包含 repo 根到叶子的配置根，但 UI project scope 只保留 path 在当前子目录内的 asset；父级 `AGENTS.md/.claude/settings.json` 实际生效却被过滤掉 — 建议给 inherited project asset 标 active project，或 scope filter 认 `projectDirs` 继承链。

#4 [hook状态][高][高] `disableAllHooks` 没进入 hook asset 的 effective 状态 — `src/main/adapters/claude-code/parsers.ts:273-345`, `src/main/adapters/claude-code/parsers.ts:333-334`, `src/main/adapters/claude-code/parsers.ts:563-565` — hook 一律 `effectiveEnabled: true`，只有 statusline 处理了 `disableAllHooks` — 建议 hook parser 显式写 `disabledByDisableAllHooks/effectiveEnabled:false`。

#5 [annotateEquivalentHookSources][中][高] 分组启用态覆盖了单个来源启用态 — `src/main/engine/scanner.ts:267-291` — 同组任一 source enabled，就把所有 asset 的 `effectiveEnabled` 改成 true；会把被禁用的同源/等价 hook 显示成有效 — 建议保留 source 自身 `effectiveEnabled`，另加 `equivalentEffectiveEnabled`。

#6 [C2修复陷阱][中][高] 改成 `**/SKILL.md` 后默认名称会全变成 `SKILL` — `src/main/adapters/claude-code/scanner.ts:122-125`, `src/main/adapters/claude-code/parsers.ts:79` — 缺 frontmatter name 时 fallback 是文件名；官方目录形态下应取父目录名 — 建议 `basename(dirname(filePath))` 作为 `SKILL.md` fallback。

#7 [C1修复陷阱][高][高] output styles 不只是目录名错误，模型也只支持 user/output-mode — `src/main/adapters/claude-code/scanner.ts:161-164`, `src/main/agent-plugins/registry.ts:142-145`, `src/shared/types/asset.ts:47` — 仅改 `output-modes` 为 `output-styles` 仍漏项目级，且 registry scope 仍是 `['user']` — 建议补 project 扫描、descriptor scope、类型命名兼容和 route/测试。

#8 [partial观测][中][中] partial 流不带累计 errors，扫描中错误短暂不可见 — `src/main/engine/scanner.ts:76-91`, `src/shared/types/ipc.ts:60-65`, `src/renderer/src/stores/app.ts:135-139` — adapter error 已进入 `errors`，但 partial 只传 assets/stats，store 不更新 `assetErrors` — 建议 partial 增加 errors 或至少 errorCount。

C. 修复优先级

1. 项目切换一致性：上一轮 #1 + B#2。坑：必须给 scan/partial/done 加 generation 校验，并同步废弃或重接 `getScanner()`。
2. watcher 增量一致性：B#1。坑：不要简单删除 ignored 后把 `.git/node_modules` 放进监听；要白名单点目录。
3. settings/hook 状态：上一轮 #5/#10 + B#4/#5。坑：缺文件是正常状态，坏 JSON 是错误；单来源启用态和等价组启用态要分开。
4. C1 output-styles。坑：不能只改目录名；还要补 project scope、descriptor、asset type 兼容、watcher 和测试。
5. C2 skills glob。坑：`SKILL.md` fallback 名称要取目录名，health checker 与 scanner 规则要一致。
6. `statSync` TOCTOU：上一轮 #7。先把裸 `statSync` 包进 safeScan/try，并保证单文件失败不丢 adapter。
7. session 解析观测：上一轮 #3/#4。先报坏行/读失败，再考虑流式解析。
8. perf 项：上一轮 #2/#8，再处理 raw partial 与 sessionCache 双向 clone。
9. 低优先级：safeGlob 静默、file-cache key 归一化。

