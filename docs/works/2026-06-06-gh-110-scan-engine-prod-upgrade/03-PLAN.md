# 任务清单 (Design 产物 / 活清单) — GH-110

从 02-SPEC 拆解。hybrid 节奏: **P1 先建包骨架+CLI+E2E 闭环 → P2 扫描覆盖增量 → P3 性能 → P4 UI/折叠 issue → P5 测试收口**。
顺序/并行边界已标注。每个实现项含 `tests:` 与 `verify:`。implement 阶段维护此清单。

## P1 — 引擎包骨架 + CLI + E2E 闭环 (基础, 严格顺序; global/high-risk)

- [x] **P1.1** 建 pnpm workspace + `packages/berth-scan-engine` 骨架: `package.json`(@berth/scan-engine, bin berth-scan, exports)、`tsup.config.ts`、`vitest.config.ts`、`tsconfig`; `src/index.ts` + `src/capabilities.ts`(agent CLI 命令清单单一真源, 供 P1.3 CLI 与 status 消费)。根 `pnpm-workspace.yaml`(仅 `packages/*`, 不动 website)。
  - tests: ✅ `pnpm --filter @berth/scan-engine test` 3/3 绿 (tests/capabilities.test.ts); `typecheck` 干净; `build` 产出 dist (ESM+CJS+dts)。根 `pnpm typecheck:node` 通过 (无回归)。
  - verify: 不适用 (无 UI)。
  - 偏差/友: 引擎包 vitest 需本地 `vitest.config.ts` 隔离 (否则继承根 renderer setup 报错)。Windows 本地 `pnpm install` 的 `electron-builder install-app-deps` postinstall 因 esbuild 平台 optional 包 ENOENT 退出 1 —— 预存 Windows 本地摩擦, 不阻塞 dev/test/build, CI(Linux) 不复现; 记 `docs/friction/20260606-3.0-implement-pnpm-postinstall-esbuild-windows.md`。
- [x] **P1.2** watcher 解耦: `AssetWatcher` 去掉 `electron` `BrowserWindow` import 与 `setWindow`/`webContents.send`, 改注入 `setListener(WatchEvent=>void)` + 公开 `notifyChange` + 纯函数 `buildWatchEvent`; `src/main/index.ts` 注入 `webContents.send('assets:changed', event)` (含 isDestroyed 守卫)。IPC handler 经核已是 `getAssetRuntime()` selector 薄代理 (codebase-map 证实), 无需改。
  - tests: ✅ tests/unit/watcher.test.ts 7/7 (含回调转发/basename assetId/无 listener 不抛); 先红(新 API 缺失)后绿。`pnpm typecheck:node` 通过; watcher.ts 已无 electron import (可提取)。
  - verify: 不适用 (引擎逻辑)。assets:changed 通道与 payload 形状不变 (`WatchEvent ≡ IpcEvents['assets:changed']`), 渲染层接收不变; 实机 assets:changed 到达留 4.0-verify 端到端抽验。
- [x] **P1.3** (3a+3b) CLI `berth-scan` 框架 + 核心扫描命令: 纯 `parseArgs` (退出码 0/2/3) + `engine-bridge.runScan` (注入 homeDir/CODEX_HOME/project/BERTH_EXTRA_*) + dispatch `scan/assets/sources/status/help/version`; 全 `--json`、只读。tsup 经 `@shared` alias 把 electron-free + native-free 引擎打进 `dist/cli.cjs`。
  - tests: ✅ cli-args 8/8 (先红后绿); scan-bridge 集成 3/3 (fixture HOME 实扫到 user/project skill+agent+CLAUDE.md); 包内 14/14 绿; tsup build 通过。CLI 实跑 smoke: `help` 出 manifest, `scan --home-dir <fixture> --json` exit 0 + stats.skills=1, `assets --type skill` count=1 exit 0。
  - verify: 不适用 (CLI)。
- [ ] **P1.3c** CLI 余下 selector 命令: `sessions/search/inspect/health/usage`(经 search.ts/health.ts/usage.ts/relations.ts 桥接), 当前返回 not-implemented。低风险增量, 可在 P1.4 后或 P2 期间补。
  - tests: 各命令 JSON + 退出码; inspect 含 relations。
  - verify: 不适用。
- [x] **P1.4** fixture HOME 树 `packages/.../fixtures/e2e/{home,project}` (claude: CLAUDE.md/skill/agent/command/output-mode/settings(hooks+perm+env)/.claude.json mcp; codex: config.toml mcp/AGENTS.md/skill; project: CLAUDE.md/.claude skill/.mcp.json) + CLI E2E golden (`tests/cli-e2e.test.ts`, 进程内 `run()` + stdout 捕获)。**关键**: 测试把 fixture 复制到 OS temp (仓库外) 再扫, 否则 `resolveProjectConfigRoots` 会上溯到 berth git root 把仓库自身 `.claude/skills`(harness-*) 算进项目作用域 —— E2E 已暴露并隔离此行为。
  - tests: ✅ cli-e2e 5/5 (golden: skill=[codex-helper,greet,proj]/agent=[reviewer]/command=[deploy]/output-mode=[concise]/claude-md=2/agents-md=1/mcp 含 user+project/hook 存在; --scope+--agent+--type 过滤组合); 包内 19/19 绿。这是 **P2 扫描重写的回归网**。
  - verify: 不适用。后续可加 subprocess (`node dist/cli.cjs`) golden 作打包态校验 (低优先, 进程内已覆盖逻辑)。

## P2 — 扫描覆盖增量 (描述符先行; 其后多项可并行, 各自 fixture+golden 守护)

- [x] **P2.0** 把引擎包门禁接入 CI: `.github/workflows/ci.yml` 在 `pnpm test` 后加 `pnpm --filter @berth/scan-engine {typecheck,test,build}` (ubuntu + windows 矩阵), 让 P1.4 golden 回归网在 CI 守护后续扫描重写。
  - tests: 由本次推送触发的 CI run 跨平台执行包 typecheck/test(19)/build 验证。
  - verify: 不适用。
- [ ] **P2.1** 描述符模型升级 (tier/emits/parserKey/ignore) + 描述符驱动 orchestrator: `scanner.ts` 从硬编码改为遍历描述符派生扫描与覆盖; 补 BuiltInScanSourceCode 新值。**[P2 其余项依赖此, 顺序]** (C9/A6)
  - tests: tests/unit/scan-descriptors.test.ts (tier/parserKey/ignore 派生 + 覆盖矩阵每行有描述符)。
  - verify: 不适用。golden snapshot 不回退 (行为等价)。
- [x] **P2.2** Claude 插件下钻 + 关联 (A1/B7/B8) — **提前到 P2.1 之前做** (直接增强 scanner, 不等描述符重构; P2.1 改为后续行为保持重构)。`scanPlugins()` 读 settings.enabledPlugins + known_marketplaces.json; glob `cache/**/.claude-plugin/plugin.json` + `data/**` 发现已装插件 (manifest 取 `.claude-plugin/plugin.json` 非 package.json); 下钻 `skills/**/SKILL.md`、`agents/**/*.md`、`commands/**/*.md`、`hooks/hooks.json`、`.mcp.json` 复用现有 parser 产出组件资产 (tag `meta.pluginId/pluginName/marketplace/origin='plugin'` + `enabled`); marketplace 资产来自 known_marketplaces.json。relations.ts: plugin→component `contains` (路径前缀, 既有) + component→plugin `belongs-to` (经 meta.pluginId, 新增)。
  - tests: ✅ 包内 plugin-relations 3/3 (组件类型 [agent,command,hook,mcp-server,skill] + contains/belongs-to + enabled/marketplace); cli-e2e golden 更新并绿 (skill=[codex-helper,greet,plugin-skill,proj]/agent=[plugin-agent,reviewer]/command=[deploy,plugin-cmd]/plugin=[demo-plugin]/marketplace=[acme]/mcp 含 fixture-plugin-mcp/stats.skills=4); 包内 22/22。repo claude-scanner 12 + engine-scanner 6 无回归; typecheck:node 绿。fixture 增 `home/.claude/plugins/cache/acme/demo-plugin/1.0.0/**`。
  - verify: 不适用 (UI 在 P4)。这是"大量插件内容缺失"根因 A 的修复。
- [x] **P2.3** Codex 插件下钻 (A2): `CodexAdapter.scanCodexPlugins()` glob `~/.codex/plugins/*/*/manifest.toml` (smol-toml 解析 name/version), 下钻 `skills/**/SKILL.md` (parseCodexSkill) + `hooks.json` (parseCodexHooksJson), tag meta.pluginId/origin='codex-plugin'; 接入 scanAll。relations 复用中央 type-agnostic resolveRelations (contains 路径前缀 + belongs-to via pluginId)。
  - tests: ✅ 包内 cli-e2e golden 增 cx-plugin-skill + plugin=[cx-plugin,demo-plugin] + stats.skills=5; plugin-relations 增 codex 用例 (4/4); 包内 23/23; typecheck:node 绿。fixture 增 `home/.codex/plugins/cx-mk/cx-plugin/{manifest.toml,skills/cx-plugin-skill/SKILL.md}`。
  - verify: 不适用。
- [ ] **P2.4** 第三方 manifest 描述符驱动只读扫描 (A3): orchestrator 按 manifest sourceDescriptors + 内置 parser 产出真实资产(替换元数据桩); 断言 implementation 不执行。**[依赖 P2.1]**
  - tests: tests/unit/manifest-scan.test.ts (断言只读、不 require 第三方入口)。
  - verify: 不适用。
- [x] **P2.5** MCP 多来源补全 (A4): 新 `parseClaudeJsonProjectMcp()` 读 `~/.claude.json` 的 `projects[].mcpServers` (scope project, meta.projectPath); scanCapabilities mcpSources 增 `<proj>/.claude/settings.json` + `settings.local.json` (parseMcpServers 无 mcpServers 时返回空, 安全)。插件 .mcp.json 已由 P2.2 覆盖。
  - tests: ✅ cli-e2e golden mcp 增断言 `fixture-projectmap-mcp` (来自 ~/.claude.json projects map); 包内 24/24; claude-scanner 12 无回归; typecheck:node 绿。fixture .claude.json 增 projects map。
  - verify: 不适用。
- [x] **P2.6** 约定嵌套 + CLAUDE.local.md + @import 关系 (A5): scanInstructions 项目约定块重写 — 增 `CLAUDE.local.md` (root + .claude) + 嵌套 `**/CLAUDE.md` (glob ignore node_modules/.git/dist/out/build/.next) + 共享 dedup 防跨 projectDir/glob 重复。@import 关系经既有 relations.ts resolveRelations (imports) 已生效, 补测验证。
  - tests: ✅ cli-e2e golden claude-md=4 (user + project root + nested sub + .claude/local); plugin-relations 增 "@import CLAUDE.md→greet skill imports 关系" 用例; 包内 24/24; engine-scanner 6 无回归。fixture 增 `project/sub/CLAUDE.md` + `project/.claude/CLAUDE.local.md`。
  - verify: 不适用。

## P3 — 性能 (秒级切换 + 无瓶颈; 顺序, 触及 runtime 高 risk)

- [x] **P3.1a** scope 切换纯过滤 (E14, 头部高频场景): `project-scope-switcher.selectScope` 对 global/user 不再调 `projectScope.activate` (即不重扫), 只 `setScopeSelection` → 客户端 `filterAssetsByAppScope` 即时再过滤。这是 5-10s 等待的主因 (任何切换都全量重扫) 的直接修复; 同时 global 保留上次已扫项目资产 (更完整)。
  - tests: ✅ project-scope-switcher renderer 7/7 (含 "user scope 不触发 activate" + "调 setScope" 断言); agent-asset-runtime 搜索作用域用例; project-scope e2e 本地通过。
  - verify: 切换感知逻辑由测试保证 (no rescan); 实机 < 1s + loading 态留 4.0-verify 截图确认。
  - **CI 修复 (随附)**: 纯前端过滤导致服务端 `assets:search` 不再随作用域变化 (e2e project-scope 红 — user 域仍搜到项目 skill)。修复: runtime 持有 `scopeSelection` + 新 fast IPC `project-scope:set-scope` (无重扫), switcher 每次切换都通知引擎; `search` 按作用域过滤 (user 域仅 user/enterprise, project/global 含全部)。本地 e2e 通过。
- [ ] **P3.1b/P3.2** 运行时 per-project 快照缓存 + global 真聚合 (E14/E15): runtime 按 projectDir 缓存快照, 重选已扫项目即时返回 (首扫仍需全扫); watcher 变更失效对应缓存。让"选项目"也接近秒级。**[runtime, 包内可测]**
  - tests: layered/cache 单测 (spy scanAll: 重选命中缓存 0 重扫; 变更后失效重扫)。
  - verify: 大规模 (1k+) 首扫/重选计时。
- [ ] **P3.2** 增量 watcher + 全类型 fingerprint cache + worker 池化 + 基准: file-cache 扩到所有 parser; watcher 局部重扫; 1k skills+1k sessions 首扫/切换计时。 (E15)
  - tests: tests/unit/file-cache-incremental.test.ts (命中率) + bench 计时断言阈值。
  - verify: 不适用 (基准数据记入 verify)。

## P4 — UI / 统一 loading / 折叠 issue (渲染层; 多数按页面顺序)

- [ ] **P4.1** 边栏统一 loading + 乐观 scope 切换 UI (F16): 统一 Spinner/骨架组件; 切换立即切 UI 后台补扫。
  - tests: tests/renderer/scope-switch-loading.test.tsx。
  - verify: 界面质量项「交互反馈/状态切换、loading 态」; 切换 < 1s; 截图请用户确认。
- [x] **P4.2** 插件↔组件关系 UI (B7/F17): PluginCard 重写为按 `meta.pluginId` 把组件归到所属插件, HeroUI Accordion 分组 (skills/agents/commands/hooks/mcp) + Chip 显示 marketplace/启用态/组件数; capabilities plugins tab 从 visibleAssets 构建 pluginId→components 映射传入。i18n 增 enabled/disabled/noComponents (en+zh)。
  - tests: ✅ tests/renderer/capabilities-plugins.test.tsx 2/2 (插件名/marketplace/Enabled/"2 components" + 展开 Skills 组见 plugin-skill + MCP 组); typecheck(web)/eslint 绿。
  - verify: 界面质量项「布局层级/信息密度、组件选择/设计系统一致性」—— **待 4.0-verify 截图请用户确认**视觉与交互。
- [ ] **P4.3** 折叠 session-error-channel (F18): useSessions/useSessionDetail 加 error 通道; HeroUI Alert+retry; 扫描错误 (snapshot.errors) 可见。
  - tests: tests/renderer/session-error.test.tsx (模拟 IPC 失败显示 error)。
  - verify: 界面质量项「error 态」; 截图请用户确认。
- [ ] **P4.4** 折叠 sessions-list-virtualization (E/F18): GroupedVirtuoso/复用 VirtualGroupedList + 分类跳转; 大列表无卡顿。 **[与 P4.3 不同文件, 可并行]**
  - tests: tests/renderer/sessions-virtualization.test.tsx (1k 行渲染 + 跳转)。
  - verify: 界面质量项「响应式/可访问性」; 1k+ 行流畅; 截图确认。
- [ ] **P4.5** 折叠 heroui-migration-followup (F17): 仅对本任务触及页面把残留手搓控件迁 HeroUI(cards/select/modal/accordion/chip); 不扩大到无关页。
  - tests: 复用受影响页 renderer 测试; 代码审计无业务层直接 `@heroui/react`。
  - verify: 界面质量项「设计系统一致性」; 截图确认。

## P5 — 测试收口 + 全量回归

- [ ] **P5.1** 输出模式/命令/子代理无副作用用例 (G19): 构造 fixture, 断言扫描只读、产出正确。
  - tests: tests/unit/output-mode-command-agent.test.ts。
  - verify: 不适用。
- [ ] **P5.2** 全量回归 + 引擎提取行为不变 (C10/C11): `pnpm typecheck && pnpm build && pnpm test` + `pnpm --filter @berth/scan-engine test` + CLI E2E golden; 全局 `pnpm harness:check`。
  - tests: 上述全绿; golden snapshot 终态。
  - verify: `pnpm dev` 启动应用端到端抽验 (扫描呈现/切换/关联/loading); 截图请用户确认主观项。

## 并行/顺序边界小结
- 顺序: P1.1→P1.2→P1.3→P1.4; P2.1 先于 P2.2–P2.6; P3.1→P3.2; P3 在 P2 后; P5.2 最后。
- 可并行: P2.2 ∥ P2.3 ∥ (P2.5 ∥ P2.6); P4.3 ∥ P4.4。P2.4 依赖 P2.1 可与 2.2/2.3 并行。
- 高 risk 顺序点: P1.2(胶水解耦)、P2.1(扫描重构)、P3.1(runtime 分层)——单独推进 + golden/单测守护。

## verify 回写
verify 不通过项作为新任务追加于此, phase 退回 implement。
