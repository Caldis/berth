# 技术方案 (Design 产物) — GH-110

每条回指 01-ANALYSIS 的验收标准编号 (A1–A6 / B7–B8 / C9–C11 / D12–D13 / E14–E15 / F16–F18 / G19)。

## 决策基线 (design 澄清结论)
1. **包边界**: 仓库内可发布 pnpm workspace 包 `packages/berth-scan-engine`(包名 `@berth/scan-engine`, bin `berth-scan`), 可 `npm publish`; Electron 以 `workspace:*` 消费。
2. **节奏 (hybrid)**: 先建包骨架 + CLI + fixture E2E 闭环(薄封装现有引擎, 行为不变), 再分批把功能增强与逻辑迁移纳入, 每批用 CLI golden-snapshot E2E 守护。
3. **覆盖分层**: 资产分 3 tier。`primary`(高价值用户可管)= 一等公民 + 完整关联; `state`(会话/历史/usage)= 已有, 补全; `resource`(daemon/teams/tasks/telemetry/cache 等运行时)= CLI 可枚举 + UI 折叠次级; 备份 `*.bak`/日志 `*.log`/锁文件 = ignore。
4. 包/bin 名与 Agent Teams 展示为实现期可调假设(见末尾)。

## 数据契约

### 1. ScanSourceDescriptor 升级为「扫描 + 覆盖」单一真源 (C9, A6)
现状 `descriptors.ts` 只供 UI 覆盖展示。升级为同时驱动**真实扫描**:
```ts
interface ScanSourceDescriptor {
  code: ScanSourceCode
  scope: AssetScope
  kind: ScanSourceKind            // directory | file | policy
  categories: AssetCategory[]
  pathPattern: string             // 含 <project>/<managed>/<home> 占位
  tier: 'primary' | 'state' | 'resource'   // 新增: 驱动 UI 分层与默认可见性
  emits: AssetType[]              // 新增: 该源产出的资产类型 (驱动 parser 选择)
  parserKey: ParserKey            // 新增: 绑定内置解析策略 (descriptor-driven scan)
  labelKey: string; descriptionKey: string
  ignore?: string[]               // 新增: glob 忽略 (*.bak, *.log, .git, node_modules)
}
```
- 新增 BuiltInScanSourceCode: `claude.user.plugins`、`claude.user.settings`、`claude.project.settings`、`claude.project.settings-local`、`claude.user.global-config-projects`(`~/.claude.json` 的 `projects[].mcpServers`)、`claude.user.rules`、`claude.project.rules`、`codex.user.plugins`、`codex.user.rules`、`codex.user.session-index`、`codex.user.state-db`(resource)。
- adapter 的 `scanAssets` 与 `scanSourceCoverage` 都从描述符派生 → 扫描覆盖矩阵 (01-ANALYSIS) 每行有唯一描述符, verify 可逐行核对 (A6)。

### 2. 插件资产与关联 (A1/A2/A7/B8)
- 插件 root 资产 (`type:'plugin'`) `meta` 增: `{ marketplace, manifestPath, version, enabled, installPath, components: {skills,agents,commands,hooks,mcp: count} }`; enabled 取自 `~/.claude/settings.json` `enabledPlugins['name@marketplace']`。
- marketplace 资产 (`type:'marketplace'`) 取自 `known_marketplaces.json` / `.claude-plugin/marketplace.json`。
- **组件资产**(skill/agent/command/hook/mcp-server)`meta` 增: `{ pluginId, pluginName, marketplace, sourceCode }`, `scope` 仍标用户/项目, 新增逻辑来源标识 `meta.origin: 'plugin' | 'user' | 'project' | 'enterprise' | 'thirdparty-manifest'`。
- 关系 (复用 `relations.ts` 既有 `resolveRelations`, 扩展):
  - plugin → component: `{from: pluginId, to: componentId, kind:'contains'}`
  - component → plugin: `{from: componentId, to: pluginId, kind:'belongs-to'}`
  - marketplace → plugin: `contains`
  - 现有 claude-md `@import`→`imports`、session→`uses`、hook→`triggered-by` 保留。

### 3. 快照模型升级为分层缓存 (E14/E15)
现状: 单 `projectDir` + 每次切换全量重扫, snapshot 全清。目标:
```ts
interface LayeredScanStore {
  global: ScanLayer        // user + enterprise + plugins, 扫一次, watcher 增量
  projects: Map<pathKey, ScanLayer>   // 每工程独立缓存, 按需扫描后常驻
  // 派生: getSnapshot(selection) = global ∪ (selection.mode==='project' ? projects[key] : ∅)
}
interface ScanLayer { assets: Asset[]; errors: ScanError[]; sources: ScanRoot[]; fingerprint: CacheSnapshot; scannedAt: string }
```
- `getSnapshotForScope(selection)`: 纯内存合并 + 过滤, **无 IO** → scope 切换/项目复选即时 (< 1s)。
- IPC `assets:snapshot` 增可选 `{ selection }` 参数, 服务端做合并(仍保留客户端 `filterAssetsByAppScope` 兼容)。

### 4. 引擎公共 API (C11) — 即既有 runtime selectors
导出 `createScanEngine(opts)/AgentAssetRuntime`、`refresh/ensureReady/getStatus/getSnapshot/getAssets/getAsset/getScanResult/getProjectDir/setProjectDir/getScanSourceGroups/getProjectCandidates/search/listSessions/getHealthChecks/getUsageSummary/resolveRelations/buildImportChain`。watcher 改 `onFileChanged?(evt)` 回调注入(去 Electron 耦合)。

## 任务分类与 debt
- **type / subtype**: feature (无 maintenance subtype)。
- **source.kind / refs**: user-request; Issue #110 + 折叠的 4 个 issue。
- **debt.estimate**: incurred 13 / repaid 4 / net 9 / scope global / risk high / areas [architecture, performance, tooling-ci] / confidence medium(design 后边界清晰, 由 low→medium)。追加 `debt.revisions[1]` (design, confidence low→medium, rationale: 提取边界实测仅 4 文件耦合、节奏定 hybrid 降低 risk)。
- **debt.final 预期**: net ≈ 7–9 (提取收敛 architecture repay 增加; 若性能/关联落地顺利可下调)。
- **Project 字段同步**: archive 前 `harness-projects.mjs done` 同步最终 debt/scope/risk。
- debt pool `total=5 status=ok`(<40), 非 maintenance 任务正常继续, 无需 override。

## 模块结构 / 组件拆分 (遵守 docs/ARCHITECTURE.md 进程隔离)

### 包布局 (C10)
```
packages/berth-scan-engine/
  package.json (name @berth/scan-engine, bin berth-scan, exports ., ./types)
  tsup.config.ts (esm+cjs+dts)
  src/index.ts        # 公共 API re-export
  src/cli.ts          # CLI dispatch (D12)
  src/lib/            # 迁入: engine/* adapters/* agent-plugins/* project-*.ts agent-homes.ts memory/*
  fixtures/e2e/{home,project}/   # E2E fixture HOME 树 (D13)
  tests/{unit,e2e}/
src/shared/           # 保持共享 (engine 与 app 同 import; 包内经 path/workspace 引用)
src/main/             # 仅胶水: index.ts / ipc/* / dev-instance.ts / watcher 注入
```
- **watcher 解耦** (C10): `AssetWatcher` 去掉 `BrowserWindow` 类型与 `webContents.send`, 改构造注入 `onChange(evt: WatchEvent)`; Electron 侧在 `index.ts` 注入 `(evt)=>win.webContents.send('assets:changed', evt)`。
- **IPC 薄代理** (C11): `handlers.ts` 的 `assets:* / sessions:* / usage:* / project-scope:*` 全部退化为 `getScanEngine().<selector>()` 直传。
- **descriptor-driven scanner** (C9): 新 `scan-orchestrator` 遍历"内置描述符 + 第三方 manifest sourceDescriptors", 按 `parserKey` 选内置 parser 读取(**绝不执行第三方代码**, A3)。

### 扫描能力实现要点
- **A1 Claude 插件下钻**: 读 `~/.claude/plugins/installed_plugins.json`(v2: `name@marketplace`→install records)+ `known_marketplaces.json`; 枚举 `cache/<mk>/<plugin>/<ver>/` 与 `marketplaces/<id>/plugins/<plugin>/` 与 `data/<plugin>-inline/`; 插件 root 取 `.claude-plugin/plugin.json`(非 package.json); 按 manifest `commands/agents/hooks/mcpServers` 字段(默认目录 `commands/ agents/ skills/<n>/SKILL.md hooks/hooks.json .mcp.json`)下钻产出组件资产 + 关系。enabled 取 `settings.enabledPlugins`。
- **A2 Codex 插件下钻**: `~/.codex/plugins/<mk>/<plugin>/manifest.toml` + 其 skills/hooks/mcp。
- **A3 第三方 manifest**: `manifest.ts` 已校验 `sourceDescriptors`; 新 orchestrator 按其 pathPattern + 内置 parser 只读扫描, 产出真实资产(替换当前的单元数据桩); `implementation.kind=adapter` 仍不执行。
- **A4 MCP 补全**: `parseMcpServers` 增读 `~/.claude.json` 的 `projects[<dir>].mcpServers`、`.claude/settings.json`/`settings.local.json` 的 `mcpServers`、插件 `.mcp.json`; 去重按 (name, scope, sourcePath)。
- **A5 约定补全**: 嵌套子目录 CLAUDE.md(glob, 受 ignore 约束)、`CLAUDE.local.md`; `@import` 用既有 `buildImportChain` 解析为 `imports` 关系并把被导入文件登记为关联(不重复成独立顶层资产, 标 `meta.importedBy`); Codex profiles / project config 优先级。
- **A6 分层 + ignore**: 描述符 `tier` 驱动; `resource` tier 默认 UI 折叠; `ignore` 过滤备份/日志/.git。

### 性能设计 (E14/E15)
- **scope 切换纯过滤**: global/user 切换不再调 `activate(undefined)` 重扫; 改为只更新 `scopeSelection` + 调 `getSnapshotForScope`(内存)。仅"选择新项目且未缓存"时触发该项目层扫描。
- **global 真聚合**: 启动/首扫构建 `global` 层 + 已知项目候选可后台预扫(可选, 受预算控制); "全局"= global ∪ 所有已扫项目层。
- **per-project 缓存常驻**: 切走的项目层不清, `Map<pathKey,ScanLayer>` 保留; 复选即时。
- **增量**: watcher 事件按 source 局部重扫该层 + 全类型 fingerprint cache(把 `file-cache` 从仅 session 扩到所有 parser, 按 `path+size+mtimeMs` 复用)。
- **worker**: 改为常驻/池化(避免每次 `new Worker`); 或全局层在主线程冷启动一次 + 项目层小扫直接主线程, 大扫走 worker。基准: 1k skills + 1k sessions 下首扫与切换计时纳入测试(E15)。

## 界面质量与交互验收 (F16–F18)
| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 能力页 plugins tab 改为"插件卡(HeroUI Card)→ 展开组件清单(Accordion 分组: skills/agents/commands/hooks/mcp)"; resource tier 折叠区 | 截图请用户确认; 插件含 N 组件时不溢出 |
| 组件选择 / 设计系统一致性 | 一律 `@/components/ui` 的 HeroUI 控件(Card/Accordion/Chip/Select/Modal/Spinner); 关系用 Chip + 链接, 不手搓 (F17, 折叠 heroui-followup) | 代码审计无直接 `@heroui/react` 业务 import; 视觉一致 |
| 交互反馈 / 状态切换 | 边栏统一 loading: scope 切换/刷新/扫描共用一致 Spinner+骨架; 乐观切换(立即切 UI, 后台补扫) | 切换感知 < 1s (E14); 截图确认 |
| loading / empty / error / disabled / focus | 统一 loading 组件(边栏 + 页面骨架); 扫描错误经 `snapshot.errors` 暴露为可见 error 态(折叠 session-error-channel) ; 空态/ focus-ring 按 GH-109 | 模拟 IPC 失败显示 error+retry; 键盘可达 |
| 响应式 / 可访问性 / 键盘可达 | 大列表虚拟化(折叠 virtualization issue, GroupedVirtuoso/已有 VirtualGroupedList); 折叠区 aria | 1k+ 行无卡顿; 键盘遍历 |
| 文案 / i18n / 数字和路径格式 | 新描述符 label/description 加 en/zh i18n key; 插件/组件计数与路径格式化 | en/zh 切换无英文兜底缺失 |

> 主观视觉项(贴顶/间距/对齐/动画)按不变量 22: verify 截图请用户确认后收口。

## 测试策略

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 备注 |
|---|---|---|---|---|
| 描述符驱动扫描 + 分层 | unit | tests/unit/scan-descriptors.test.ts | pnpm test | tier/parserKey/ignore 派生 |
| Claude 插件下钻 + 关联 (A1/B7/B8) | unit + e2e | tests/unit/plugin-scan.test.ts, packages/.../tests/e2e/plugins.e2e.ts | pnpm test / berth-scan scan --json | fixture 含 cache/<mk>/<plugin>/<ver> |
| Codex 插件下钻 (A2) | unit | tests/unit/codex-plugin-scan.test.ts | pnpm test | fixture manifest.toml |
| 第三方 manifest 描述符扫描 (A3) | unit | tests/unit/manifest-scan.test.ts | pnpm test | 断言不执行代码 |
| MCP 多来源补全 (A4) | unit | tests/unit/mcp-sources.test.ts | pnpm test | ~/.claude.json projects map 等 |
| 约定嵌套 + @import 关系 (A5) | unit | tests/unit/instructions-imports.test.ts | pnpm test | buildImportChain 复用 |
| 分层缓存 + scope 纯过滤 (E14) | unit | tests/unit/layered-store.test.ts | pnpm test | 切换不触发重扫(spy scanAll) |
| 增量 watcher + 全类型缓存 (E15) | unit | tests/unit/file-cache-incremental.test.ts | pnpm test | 命中率 + 基准计时 |
| CLI 命令 + JSON + 退出码 (D12) | e2e | packages/.../tests/e2e/cli.e2e.ts | berth-scan <cmd> --json | 退出码 0/2/3 |
| fixture HOME E2E 闭环 (D13) | e2e | packages/.../tests/e2e/scan.e2e.ts | pnpm --filter @berth/scan-engine test | golden snapshot, 路径归一化 |
| 插件关联 UI + 统一 loading (F16/F17) | renderer | tests/renderer/capabilities-plugins.test.tsx | pnpm test | HeroUI 控件 + 展开 |
| session 错误通道 (F, 折叠) | renderer | tests/renderer/session-error.test.tsx | pnpm test | IPC 失败 error 态 |
| 引擎提取后 import 不破 (C10/C11) | harness/build | — | pnpm typecheck && pnpm build | 行为不变回归 |
| 输出模式/命令/子代理无副作用用例 (G19) | unit | tests/unit/output-mode-command-agent.test.ts | pnpm test | 构造 fixture, 断言只读 |

无自动化例外: 主观视觉/动画 taste → manual 截图请用户确认(不变量 22)。

## 验收标准映射
| SPEC 项 | ANALYSIS 验收 |
|---|---|
| 描述符升级 + 分层 + ignore | A6, C9 |
| Claude/Codex 插件下钻 | A1, A2 |
| 第三方 manifest 描述符扫描 | A3 |
| MCP 多来源 | A4 |
| 约定嵌套 + import | A5 |
| 插件↔组件关系 + UI | B7, B8, F16 |
| 包提取 + watcher 解耦 + IPC 薄代理 | C10, C11 |
| 公共 API | C11 |
| CLI + 退出码 | D12 |
| fixture E2E 闭环 | D13 |
| 分层缓存 + scope 纯过滤 + 真聚合 | E14 |
| 增量 + 缓存 + 基准 | E15 |
| 统一 loading | F16 |
| HeroUI 控件 | F17 |
| 折叠 issue (error/virtualization/heroui) | F18 |
| 无副作用测试 | G19 |

## 实现期可调假设 (非阻塞)
- 包名 `@berth/scan-engine` / bin `berth-scan`(若冲突可改 `berth-engine`)。
- Agent Teams (issue 2026-06-03): 默认归 `state` tier 的 runtime 资产, 不进 Instructions 一等公民; 若实测官方将其作为可复用角色定义则归 subagent。实现时按本机实际数据定, 记录到 issue。
- 项目候选枚举增强(文件系统发现工程)列为 E 层可选增强, 不阻塞主线。
