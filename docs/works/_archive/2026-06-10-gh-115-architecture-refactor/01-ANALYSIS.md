# 需求分析 (Explore 产物)

> GH-115 架构全面分析。分析由 ULTRACODE workflow `gh115-arch-analysis` 产出 (48 subagents / 1021 tool calls / ~107 min): 9 路并行 survey (main-arch / renderer-arch / ipc-boundary / dup-logic / dup-components / orphans-tooling / engine-package / tests-map / works-hotspots) + critic 盲区补查 3 路 (build-packaging / error-logging / electron-security) + 34 条对抗验证 + 综合去重。
> 统计: 11 路 survey 共 106 条 findings: 0 条被驳回 (isReal 全真), 34 条经对抗验证通过且其中 1 条降级 (url-guard high→low/medium, exploit 链证伪)、72 条低风险未对抗; 合并去重后产出 34 个问题 (high 10 / medium 19 / low 5)、6 大主题、20 项已验证孤儿 (合计 ~1100 行产线死代码 + 98 个 asar 死包 + 24 个 i18n key + 3.56MB 资源); 7 条已立案 issue 全部获得新证据、口径纠正或工料细化, 未与新问题重复立案。
> 完整证据: `assets/synthesis.json` (本综合的结构化原文)、`assets/confirmed-findings.json` (106 条原始 finding 含 verdict)、`assets/works-hotspots.json` (在途任务足迹)。

## 现状理解

### 架构现状底图 (15 条, 后续目标架构设计的基线)

1. 进程拓扑: Electron main ~14.5k 行/57 文件 + preload 96 行纯透传桥 (contextBridge, window.api 唯一通路) + renderer ~17.3k 行 (React 19) + src/shared ~1.7k 跨进程纯类型/纯逻辑; main 双构建入口 (index.ts 与 engine/assets/worker.ts), 扫描在 worker_threads 执行, worker 值依赖闭包对 electron 干净。
2. main 模块依赖方向: index.ts→{ipc, engine/assets, engine}; ipc→几乎全部模块 (engine/adapters/agent-plugins/agent-teams/memory); engine 5 文件直连 adapters 具体实现 (绕过 adapter-registry); adapters↔agent-plugins 是唯一模块级值依赖环 (SOURCE_DESCRIPTORS 数据放错侧); memory 与 agent-teams 是刻意隔离的按需读取 IPC 域, 不进 asset/scanner/watcher 管线。
3. electron 值依赖仅 3 文件 (index.ts/dev-instance.ts/ipc/handlers.ts), better-sqlite3 仅 index.ts:5 一处、经工厂注入 sqlite-snapshot-store — 引擎与宿主的解耦缝已预制; CLI 迁移最小集 30 文件 (~7.5k 行) 实测 0 处 import electron/better-sqlite3/worker_threads, 物理迁包是机械搬运而非解耦重构。
4. AgentAdapter 契约 (shared/types/asset.ts) 实际被调用面仅 detect/scanAll/scanSourceCoverage 三方法; scanAssets/watchAssets/resolveRelations 零调用者; per-file 资产派生、session transcript 解析、health 检查、watch 路径四类真实需求不在契约内, 是 7 处绕行直连的根因。
5. IPC 现状: 35 个 invoke channel 在 handlers.ts 单函数注册 + 3 个推送事件; 读路径统一经 getAssetRuntime() 单例; 通道名以裸字符串在 4 个文件重复, IpcChannels/IpcEvents 契约表 0 引用且已漂移; 全链活跃率 28/35; handlers.ts 内嵌 ~276 行 session/模型推断域逻辑且零直接测试。
6. renderer 分层 (import 实测) 基本健康: lib→lib; stores(单 Zustand 180 行)→@shared; hooks→stores+lib; ui(GH-105 HeroUI 唯一入口纪律成立)→@heroui; shared→ui/lib/hooks/stores; pages→全部; 反向边仅 3 条 (settings-dialog→pages, scope-switcher→settings, memory-view→layout); 无循环依赖。
7. renderer 数据流: useAssetRuntime 全局唯一 mount (app-layout) → assets.status/snapshot → store; 列表数据不进 store, 走 hooks 层 5 套手写 SWR 缓存 (use-ipc ×3 + use-memory + use-agent-teams, 策略已分叉); 推送 assets:changed/progress 经 foldKeepingShallow 增量折叠; 唯一绕行写路径是 project-scope-switcher 的 setAssets 裸替换。
8. 页面规模: 8 页共 5820 行, session-detail 1593 / capabilities 1054 为巨石页, 各含 ~200 行无 React 依赖的内联纯逻辑; components/shared 25 件中 4 件零引用孤儿、3 件单页专属; 虚拟列表子系统 (virtual-grouped-list + virtual-list-model + category-jump-nav, 3 页复用) 是渲染层抽象质量最好的样板。
9. 扫描源知识 (目录/文件→parser/scope 映射) 以操作性代码散布 claude scanner/codex index/shallow-conventions/derive-asset/watcher 5+ 模块, 注释自认 mirror 且已实际分叉; 声明式 ScanRoot descriptor 形态已存在 (agent-plugins/descriptors.ts) 但只覆盖 source coverage 一个消费方。
10. 测试: 根 vitest 133 文件 917 用例全绿 + scan-engine 包 24 用例 + playwright e2e 6 个 (CI 仅 windows-2022); engine 层 collaborator-seam 注入风格统一, runtime 拆分安全网最强 (24 用例钉状态机/竞态/折叠); 零直测集中在 ipc/handlers、preload、src/main/index、10 个 shared 组件; tests/ 不参与任何 tsconfig project, mock 漂移对 typecheck 不可见。
11. 错误处理形态: 扫描故障走 status-as-data (runtime 永不 reject, stale-while-error 返旧快照); 三套记账机制 (ScanError/HealthCheck/manifest.errors) 均 UI 可达; 但主进程 console.* 为 0、无日志依赖、无 uncaughtException/unhandledRejection/render-process-gone 钩子, stack 在 runtime 一跳即丢。
12. 打包链: electron-vite (renderer 全量 bundle, main/preload externalize) + electron-builder files 黑名单 (脚手架后未更新, website/scripts/.agents 全进包) + tsup 独立 CLI 包 (与主构建零共享); dependencies 的正确语义 = main/preload 运行时依赖 (实际最小集 8 包), 现混入 7 个 renderer 库; mac 产物无签名、fuses 全出厂默认。
13. 安全基线: contextIsolation/nodeIntegration/无远程内容/无 webview/CSP 三态一致 — 符合; sandbox:false (无必要回退)、无 will-navigate 守卫、window.open 与 shell:openExternal 无协议白名单、无 permission handler、asar 无完整性校验 — 不符合; '凭证不进渲染进程' 边界由 capabilities 页内联的 redactStatusLineCommand 正则把守。
14. 收敛先例已立: shared/path-utils 完成 samePath 四副本收敛 (已知#4 部分 DONE); adapters/_shared 是事实上的跨 adapter 收敛层且已被 agent-teams 跨模块借用 — '非 adapters 模块不依赖 adapters' 仅是惯例而非约束, 这是 7 份 isRecord 副本的结构性成因。
15. 在途 13 任务: 仅 gh-103 (图表配色) 处于 implement, 其足迹 5 文件随时回改; 其余 12 个 verify 态; i18n locales (23 commits churn 榜首)、top-navigation (4 任务汇聚)、instructions/sessions/hooks-lifecycle-view 是多任务汇聚面; packages/berth-scan-engine 不在任何在途任务足迹内, 可放心触碰。

### 六大主题总览

| # | 主题 | 问题数 | high | 一句话根因 |
|---|------|--------|------|-----------|
| 1 | 引擎域: agent 扩展轴与包边界 | 9 | 2 | 共同根因是 AgentAdapter 契约与真实消费面错位: 契约声明的三方法零调用, 而 per-file 派生/会话解析/health/watch 四类真实需求不在契约内, 消费方只能绕开 registry 直连实现。 |
| 2 | IPC 契约与测试安全网 | 5 | 2 | 跨进程契约存在四份手工副本 (handlers 注册/preload wrapper/手写 d.ts/测试 mock), 无任何编译期派生机制强制一致, 漂移已实际发生且测试 mock 在主动强化错误契约。 |
| 3 | 孤儿与死代码沉积 | 5 | 0 | 共同根因是功能换代只接新不拆旧: guidance 体系换代 (asset-guidance→feature-guidance)、settings 本地源改版 (GH-85)、HeroUI 迁移 (GH-105)、hooks 通道退役 (a471ed2)、teams 删除又回加 (gh-94/GH-114), 每次都留下完整旧链 (组件+hook+i18n+IPC+测试)。 |
| 4 | 渲染层复用与页面结构 | 7 | 1 | 渲染层分层骨架健康 (import 方向干净、仅 3 条反向边、GH-105 入口纪律成立), 问题集中在抽象层断代: 第一代 shared 抽象 (AssetCard/StatCard/TabGroup) 死亡后没有立二代, 页面各自手搓, 同语义在 3-13 个文件重复并开始漂移 (资产卡 4 克隆、指标瓷砖 6 实现、节标签 33 处 9 种写法、SWR 缓存 5 份策略分叉)。 |
| 5 | 错误处理与可观测性 | 4 | 1 | 架构里三套错误记账机制 (ScanError/HealthCheck/manifest.errors) 设计完整且 UI 可达, 但被两类缺口架空: 其一, 主进程零日志零进程钩子, 打包应用 (无终端) 下启动失败/watcher 故障/未捕获异常完全无痕迹, stack 在 runtime 一跳即永久丢失。 |
| 6 | 打包分发与安全基线 | 4 | 3 | 打包与安全配置停留在脚手架时代, 与产品已到 0.1.x 可分发形态脱节: dependencies 语义混乱使 asar 携带 98 包死代码且下次打包膨胀 ≥20MB。 |

## 关联与依赖

### 问题清单 (34 项, 按主题分组, R{n} 为全局优先级排名)

#### 主题: 引擎域: agent 扩展轴与包边界

> 共同根因是 AgentAdapter 契约与真实消费面错位: 契约声明的三方法零调用, 而 per-file 派生/会话解析/health/watch 四类真实需求不在契约内, 消费方只能绕开 registry 直连实现。结果是 per-agent 知识 (扫描源路径表/health 检查族/会话 id 格式/home 解析协议) 以操作性代码散落 5-7 处并已实际分叉, 接入第三个 agent 需改 6+ 处而非注册一个 adapter。纯助手函数因挂在 adapters/_shared 下无中立落点而被 7 处复制。这条主轴同时决定 engine 成包 (已立案 #1) 的切线: 必须先解 descriptors 反向值依赖环、把 hooks-manager 写能力留宿主、包域按 engine 全量规划。修复顺序上, 契约扩展与声明式源表是其余收敛工作的前置。

##### R1 · high · `adapter-contract-mismatch`

**AgentAdapter 抽象失效: 契约三方法零调用、registry 仅 1 个消费者, engine/ipc 7 处绕行直连 adapters, 另有 adapters↔agent-plugins 值依赖环**

- 文件: `src/main/agent-plugins/adapter-registry.ts` · `src/shared/types/asset.ts` · `src/main/engine/health.ts` · `src/main/engine/shallow-conventions.ts` · `src/main/engine/assets/derive-asset.ts` · `src/main/engine/watcher.ts` · `src/main/ipc/handlers.ts` · `src/main/agent-plugins/descriptors.ts`
- 已对抗验证: createAgentAdapters 全仓唯一消费者是 engine/scanner.ts:9, 且 scanner 只调 detect/scanAll/scanSourceCoverage; 契约声明的 scanAssets/watchAssets/resolveRelations 零调用、三实现全带桩。契约同时过窄: per-file 派生、session 解析、health 检查、watch 路径四类能力缺位, 致 health/relations/shallow-conventions/watcher/derive-asset/handlers 共 7 处直连两家 adapter 实现, 接入第三个 agent 需改 6+ 处。叠加 adapters/{claude-code,codex}/index.ts 反向值依赖 agent-plugins/descriptors (唯一模块级值环), engine 迁包切线被这条边卡住。
- 建议: 按实际消费面重做契约: 删 3 个死方法, 增 deriveAssetsForFile/parseSessionDetail/healthChecks/watchTargets 经 registry 统一分发; SOURCE_DESCRIPTORS 数据下沉 adapters 侧使依赖单向; 短期最低限度先把 agentId→实现的 dispatch 收敛为 engine 内单一 capability map。

##### R4 · high · `scan-source-table-pentaplication`

**扫描源路径表 (目录/文件→parser/scope) 5+ 处操作性重写, 注释自认 mirror, 两处已实际行为分叉**

- 文件: `src/main/adapters/claude-code/scanner.ts` · `src/main/adapters/codex/index.ts` · `src/main/engine/shallow-conventions.ts` · `src/main/engine/assets/derive-asset.ts` · `src/main/engine/watcher.ts` · `src/main/agent-plugins/descriptors.ts`
- 已对抗验证: 同一张映射表存在于 claude scanner 散落调用、codex index、shallow-conventions 的 CAPABILITY_GLOBS、derive-asset 的 DISPATCH 表、watcher getAssetWatchPaths, 另有 descriptors 与 computeMcpMerged 两份子集; derive-asset.ts:45/68 注释明文 'Mirrors ...'。已验证两处分叉: computeMcpMerged 只看 user 两源 (缺 project/.mcp.json/enterprise); scanner 对 settings.local.json 只跑 2 个 parser 而 shallow/derive 跑完整 5 个 — 副本间语义已不一致。新增一种资产目录需改 5 个文件。
- 建议: 建声明式单一真源表 (engine/asset-sources.ts 或扩展 descriptors 模式): {agentId, scope, pattern, kind, parser, watch}, 由 adapter scanAll/shallow/derive/watcher/MCP 源五方消费; 分两步: 先合并已几乎同形的 shallow 与 derive 两表, 再接 watcher 与 mcp。与 engine 迁包兼容 (表无 Electron 依赖)。

##### R12 · medium · `engine-package-migration-scope`

**engine 成包 (已立案: engine-shared-core-package) 工料细化: 迁移零阻断但包域应按 engine 全量规划; 4 个缺口 — hooks-manager 写能力、桥接 3 文件 typecheck 盲区、CLI manifest 6 命令 UNWIRED、3 个运行时加载风险点仅 windows e2e**

- 文件: `packages/berth-scan-engine/src/engine-bridge.ts` · `packages/berth-scan-engine/tsconfig.json` · `src/main/engine/hooks-manager.ts` · `src/main/engine/assets/worker-host.ts` · `packages/berth-scan-engine/package.json`
- 正面事实: 闭包 30 文件 0 处 import electron/better-sqlite3/worker_threads, sqlite 工厂注入与 workerPath 注入缝已预制, 迁移是机械搬运。缺口: (1) hooks-manager.ts 是 engine 唯一带写副作用模块, 与包 'strictly read-only' 承诺冲突, 切线应留宿主; (2) engine-bridge/cli/cli-bin 三文件两侧 tsc 均不覆盖, tsconfig 注释陈述与事实不符; (3) CLI manifest 承诺 10 命令 6 个 UNWIRED, 包测试已越界测闭包外模块, 按最小集迁移将二次搬迁; (4) 已验证: worker 入口产物路径/SQLite Electron-ABI/打包布局三个真风险点单测射程外仅 windows-only e2e 接住; (5) tsup ESM cli 死产物 + sourcemap 占发布体积 70% + scoped 包缺 publishConfig 当前不可发布; session-detail.ts 与 agent-plugins/registry 应随包迁。
- 建议: 工料按 engine 全量域一次规划 (除 hooks-manager); 迁移前补 out/main/asset-worker.js 存在性断言 + 真 worker 集成测试 + ABI 冒烟; repo typecheck 增加 packages project; tsup cli 仅 cjs、关 sourcemap、补 publishConfig {access:'public'}; 验收以 scan-bridge+cli-e2e 黄金输出为基线。

##### R14 · medium · `main-pure-helper-copies`

**主进程纯助手函数跨模块复制成簇: isRecord ×7、frontmatter 解析 ×4、extractAtImports ×2、路径包含判定 4 套 2 算法且语义矛盾、scan 骨架双侧同构 — 根因是工具挂在 adapters/_shared 下无中立落点**

- 文件: `src/main/adapters/_shared/parser-helpers.ts` · `src/main/adapters/_shared/markdown.ts` · `src/main/engine/health.ts` · `src/main/memory/sources/united-memory.ts` · `src/main/memory/sources/claude-native.ts` · `src/shared/path-utils.ts`
- isRecord/readString 等守卫在 7 个非 adapters 文件本地重写, 而 agent-teams 又直接跨模块 import 它 — 同一条潜规则两种执行结果; memory 两份 splitFrontmatter 与 _shared 有 5 点语义差 (空 frontmatter/EOF fence/非 record YAML 处理不同), 其镜像注释指向的原实现早已被删; health.ts 原样重写 extractAtImports (与 _shared 逐字符等价) 并维护第 4 个 frontmatter 变体; 路径包含判定 4 套实现对'等值是否算 inside、win32 是否折叠大小写'答案互相矛盾; adapters 双侧 safeScan/scanDir/glob 选项/插件 tag 闭包仍同构未抽 (含 '已立案: memory/sources splitFrontmatter (#7)' 的核实与扩面)。
- 建议: 两步: 无 node 依赖纯守卫 (isRecord/readString/readNumber/safeId/splitFrontmatter/extractAtImports) 下沉 src/shared 或新建 main/_shared, parser-helpers 改 re-export 保持 import 面; shared/path-utils 增 isPathInside({includeEqual}) 与 dedupePaths 按 samePath 先例收敛; 新增 adapters/_shared/scan-helpers.ts 收 safeScan/safeGlob/scanDir/tagPluginComponent。

##### R15 · medium · `main-monolith-data-files`

**main 巨石双文件: health.ts 1453 行 ≥6 类职责 (双 agent 检查与 plugin healthCheckDescriptors 两套体系不互通), registry.ts 1347 行中 ~870 行静态描述符数据, renderer 路由字符串三处硬编码**

- 文件: `src/main/engine/health.ts` · `src/main/agent-plugins/registry.ts` · `src/renderer/src/lib/asset-route.ts`
- health.ts 单文件承担 claude 检查/codex 检查/跨 agent 检查/scan-error 转换/check 基建/自带 fs 与解析副本, ~25 个检查函数串行经单入口; agent-plugins 已为内置 agent 建模 healthCheckDescriptors 但 health.ts 实现不经该模型, 第三方 manifest agent 与内置是两套并行体系。registry.ts 数据与逻辑 2:1 混居, HEALTH_TARGET_ROUTES 与 health.ts routeForAssetType 把 '/configuration/capabilities?tab=hooks' 等 renderer 路由硬编码进主进程, 加 renderer 侧 asset-route.ts (已立案: shared-path-and-type-config #4) 共三处独立维护, renderer 改路由静默断链。与 adapter-contract-mismatch 同根因的 per-agent 表现面。
- 建议: health 按 agent 拆 check provider + 中立 check 基建, 长期随 adapter 契约扩展使内置与 manifest 同路径; registry 静态数据拆 builtin-claude-code.ts/builtin-codex.ts; 路由字符串收敛 @shared 单源 (与 issue #4 renderer 侧合并做)。

##### R17 · medium · `session-id-implicit-contract`

**会话资产 id 三种格式并存且 agent-teams 硬编码其一反查; 两 adapter 会话 meta 解析骨架同构但损坏行记账不对等**

- 文件: `src/main/adapters/claude-code/parsers.ts` · `src/main/adapters/codex/parsers.ts` · `src/shared/asset-dedupe.ts` · `src/main/agent-teams/index.ts`
- claude `session-${id}`、codex `codex-session-${id}-${hash36}`, 而 shared/asset-dedupe.assetEntityId 自述 canonical 且规划为 SQLite 主键, 两个解析器都没用它; agent-teams 以字符串拼接 `session-${leadSessionId}` 反查 claude 会话 — id 格式成跨模块隐式契约, 改 id 方案静默破坏 teams 链接。JSONL 行迭代习语写了三遍, 仅 claude 计 malformedLineCount 并上报, codex 静默吞坏行, 同类数据质量问题两 agent 可见性不对等。
- 建议: 短期暴露 sessionAssetId(agentId, sessionId, filePath) 单点函数, agent-teams 改调用; readJsonLines 提升 adapters/_shared (带 onMalformed 回调) 三处替换, codex 补齐记账; 长期向 assetEntityId 迁移需迁移层 (id 是 renderer 持有的不透明句柄)。

##### R18 · medium · `claude-home-resolution-bypass`

**memory/agent-teams/handlers 绕过 agent-homes 多 home 解析: BERTH_EXTRA_CLAUDE_DIRS 对 memory 笔记/teams/MCP 合并/平台信息不生效**

- 文件: `src/main/agent-homes.ts` · `src/main/memory/sources/claude-native.ts` · `src/main/agent-teams/index.ts` · `src/main/ipc/handlers.ts`
- resolveClaudeDirs 是官方多 home 解析器 (scanner/watcher/health 消费), 但 claude-native/agent-teams/handlers 四处自行拼 os.homedir()/.claude — 配置了额外 claude home 的用户, 资产与健康检查能看到第二 home, 而 memory/teams/mcp:merged/platform:info 只看主 home; 'claude 配置根'在主进程内存在两种解析协议 (codex 侧无此问题)。
- 建议: memory 与 listAgentTeams 默认值改遍历 resolveClaudeDirs (构造参数保留供测试), handlers 两处改 import agent-homes; 若刻意只支持主 home, 暴露 primaryClaudeDir() 让例外可检索。

##### R30 · medium · `shared-pure-logic-forks`

**shared 单源未用尽的双实现分叉: normalizeProjectPath 双实现 Windows 盘根已分叉 ('X:' vs 'X:/')、签名习语两侧独立实现、emptyUsageSummary/costSourceToFormula 重复、格式化器散落页面**

- 文件: `src/shared/scope.ts` · `src/renderer/src/lib/session-location-groups.ts` · `src/shared/usage-summary.ts` · `src/main/engine/usage.ts` · `src/renderer/src/lib/result-signature.ts` · `src/main/engine/search.ts`
- sessions 页分组键与 scope 过滤键对同一 Windows 盘根项目产出不同 canonical 形态, 跨体系比较即不等; 项目名取段三份实现; / 指纹习语 main 侧不转义有伪相等风险 (已立案 #4 余项核实); engine/usage 私有重定义 emptyUsageSummary/costSourceToFormula 而同文件已 import shared, 无依赖障碍; percentage/duration/日期格式化在页面各自再造 (lib/utils 是既定归宿但未吸收)。
- 建议: 以 shared/scope.ts 为单源定盘根 canonical (建议 'X:/') 修正另一侧; 建 src/shared/signature.ts (≤30 行) 两侧消费; shared emptyUsageSummary 参数化 catalog, costSourceToFormula 改 export; formatPercentage/formatDurationMs/formatDateYMD 提升 lib/utils。

##### R33 · low · `root-scope-files-misplaced`

**project-scope.ts 与 project-scope-runtime.ts 是 engine 域逻辑误置 main 根级, 与 engine/assets/runtime 三名近义分属三层, 检索成本高**

- 文件: `src/main/project-scope.ts` · `src/main/project-scope-runtime.ts` · `src/main/agent-homes.ts`
- project-scope 全部 3 个 importer 都在 engine; project-scope-runtime 唯一 importer 是 ipc/handlers, 属 engine 编排层。对照: agent-homes/project-config-roots 被 adapters 与 engine 双侧消费, 根级中立位是避免 adapters→engine 依赖的合理选择, 不应移动。
- 建议: 迁 engine/project-scope.ts 与 engine/scope-activation.ts (顺带消歧命名); 与 engine 迁包切线一并定 (两文件都在 CLI 闭包内)。

#### 主题: IPC 契约与测试安全网

> 跨进程契约存在四份手工副本 (handlers 注册/preload wrapper/手写 d.ts/测试 mock), 无任何编译期派生机制强制一致, 漂移已实际发生且测试 mock 在主动强化错误契约; 自称契约的 IpcChannels 表 0 引用。同一根因的纵深表现: handlers.ts 把 IPC 当第二业务层 (~276 行域逻辑) 且因顶层 import electron 零直测, 死通道与 phantom 方法长期挂在注册表使 IPC 面失真, 健康检查本地化甚至依赖主进程英文 prose 的逐字匹配。tests/ 游离于 typecheck、e2e 仅 windows CI, 使所有这些漂移对开发者全程静默。修复核心是单一真源 + 派生 (typeof api、typed handle/invoke) + 一个三方对账测试。

##### R2 · high · `ipc-second-business-layer`

**ipc/handlers.ts 548 行成第二业务层: ~276 行 session/模型推断域逻辑错层 + toSessionSummary 与 runtime 逐字重复 + computeMcpMerged 行为漂移 + 零直接测试**

- 文件: `src/main/ipc/handlers.ts` · `src/main/engine/assets/runtime.ts` · `src/main/ipc/session-activity.ts`
- 已对抗验证: 35 channel 单函数注册 (window/theme/shell/sessions 等 13 个域混居, 函数名 registerAssetHandlers 名实分离); sessions:get 厚编排含 KNOWN_MODEL_METADATA/inferModelProvider 等 ~130 行纯函数模型知识库与 agentId switch 的 adapter 分发; toSessionSummary 21 行与 runtime.ts:560 字节级重复, 列表/详情页可静默分叉; computeMcpMerged 绕 runtime 硬编码 ~/.claude 路径, BERTH_EXTRA_CLAUDE_DIRS/project/enterprise 的 MCP 不出现在 mcp:merged。顶层 import electron 致 vitest 不可加载, 全仓 0 测试触达 (唯一例外是已抽出的 session-activity.ts, 证明抽离即可测)。
- 建议: 新建 engine/session-detail.ts 迁入全部域逻辑与模型知识库, sessions:get 压成单调用; toSessionSummary 收敛 engine 单实现; computeMcpMerged 改基于 runtime 快照 + agent-homes 解析; 注册按域拆分; 留下的注册层用 vi.mock('electron') 补 channel 映射薄测试。

##### R3 · high · `ipc-contract-unenforced`

**跨进程契约四份手工副本零编译期强制, 已实际漂移: 自称契约的 IpcChannels 0 引用且缺 3 现役通道、preload 两个 phantom 方法、d.ts 手写镜像、测试 mock 主动掩盖**

- 文件: `src/shared/types/ipc.ts` · `src/preload/index.ts` · `src/preload/index.d.ts` · `src/main/ipc/handlers.ts` · `tests/setup.ts`
- 已对抗验证 (三路 survey 交叉证实): IpcChannels/IpcEvents 全仓引用各 1 处即定义行, 表内容缺 assets:snapshot/status/refresh 三个最核心现役通道、含 3 个死通道与幽灵事件 scan:progress、assets:changed payload 与实发 WatchEvent 不符。preload assets.scan 调用不存在的 'assets:scan' (调用必 reject), d.ts:89 声明运行时不存在的 hooks.statuses (编译过、运行 undefined), PlatformInfo 三处定义且 claudeDir 字段零消费; tests/setup.ts mock 镜像了两个 phantom, hooks-lifecycle-view 测试还在断言幻影方法的调用行为 — 测试基础设施在强化错误契约。tests/ 不在任何 tsconfig project, mock 无 BerthAPI 约束, 漂移对 typecheck 全程不可见。
- 建议: preload 导出 export type BerthAPI = typeof api 消灭手写 d.ts; handlers/preload 经 K extends keyof IpcChannels 的 typed helper 派生; 至少加一个一致性单测: handlers 注册集合 == preload invoke 集合 == IpcChannels 键集合 == setup.ts mock 键集合; tests 纳入 tsconfig.test.json 并给 mockApi 标 satisfies BerthAPI。

##### R11 · medium · `dead-ipc-surface`

**IPC 死面 8 项: 4 个全链死通道 + 3 个 handler-only 不可达通道 (连带 ~90 行死业务逻辑) + 1 个 phantom 方法, 使 IPC 真实大小失真**

- 文件: `src/main/ipc/handlers.ts` · `src/preload/index.ts` · `src/preload/index.d.ts` · `src/shared/types/ipc.ts` · `tests/setup.ts`
- 全部已对抗验证: theme:get/hooks:status/hooks:set-enabled/assets:scan-all 全链 (handler+preload+d.ts) 存活但 renderer 零调用 (归档文档佐证为 GH-10/settings 改版遗留); assets:relations/import-chain/mcp:merged 有 handler 无 preload wrapper 永不可达, 连带 computeMcpMerged 38 行与 MCPMergeInfo 类型死亡, engine/relations.ts 生产路径仅剩这两个死通道消费; preload assets.scan 指向不存在的 channel, 调用必 reject。
- 建议: 按链路整删 (handler+preload+d.ts+IpcChannels 条目+setup.ts mock); relations/import-chain/mcp-merge 若在路线图则补 preload 接线, 否则删 handler 并评估 engine/relations.ts 归档; 与 ipc-contract-unenforced 的一致性测试同批落地防复发。

##### R20 · medium · `health-i18n-string-contract`

**健康检查本地化靠逐字匹配主进程英文 prose: ~30 条 EXACT_TEXT_KEYS 字典, 措辞微调即静默击穿, 是渲染层唯一依赖主进程字符串内容的契约**

- 文件: `src/renderer/src/lib/health-check-i18n.ts` · `src/main/engine/health.ts`
- 主进程生成英文 prose, 渲染层用逐字字典 + 正则反查回 i18n key 再翻译; 主进程任何措辞调整不报错, 只是该条目对中文用户回退英文, 无测试或类型可拦截 — 与其余 IPC 类型化契约纪律相悖。handlers 错误信封缺失的 formatHookToggleError message 子串匹配是同款脆弱契约第二例。
- 建议: HealthCheck 契约改携带稳定 messageKey + params, 英文 prose 移入 en.json 与 zh.json 平级; 迁移期主进程同时带 key 和 legacy 文本; 与 health 按 agent 拆分 (main-monolith-data-files) 同批做成本最低。

##### R29 · medium · `test-net-unevenness`

**测试网不均: e2e 仅 windows CI 与主开发平台脱节、10 个组件合并目标零直测、3 个源码文本断言是重命名地雷、parsers.test 196 行假覆盖、website 测试无 CI 入口、根级 3 个 .ts 配置 typecheck 盲区**

- 文件: `.github/workflows/ci.yml` · `tests/unit/parsers.test.ts` · `tests/renderer/theme-palette.test.ts` · `playwright.config.ts` · `website/vitest.config.ts`
- 唯一全链路集成网 (真 worker/SQLite ABI/chokidar/IPC) 在 CI 仅 windows-2022, mac/ubuntu 对主进程装配类重构零集成信号; file-viewer-drawer/floating-popover/filter-bar 等 10 个合并高发组件无直测; theme-palette/token-usage-display/scope-badge-palette 三个测试 readFileSync 读源码做字符串断言, 提供零行为保护但重命名即假阳性; parsers.test.ts 全部断言针对测试内联副本不触及 src; website 2 个测试无任何 CI 执行入口; vitest/playwright/tailwind 三个根级 .ts 配置不在任何 tsconfig include。正面: runtime 拆分网最强 (24 用例 seam 级), 组件页级网广。
- 建议: e2e 矩阵加 macos-latest 或 ubuntu+xvfb (每 OS ~1-2 分钟, 重构密集期性价比最高); 合并顺序按网的有无排, 10 个无直测组件动前补最小行为测试 (focus-trap 必测 Tab 循环与 Escape); 删 parsers.test.ts (有价值断言先迁真实现); deploy-website.yml 加 vitest 步; 3 个配置加入 tsconfig.node.json include。

#### 主题: 孤儿与死代码沉积

> 共同根因是功能换代只接新不拆旧: guidance 体系换代 (asset-guidance→feature-guidance)、settings 本地源改版 (GH-85)、HeroUI 迁移 (GH-105)、hooks 通道退役 (a471ed2)、teams 删除又回加 (gh-94/GH-114), 每次都留下完整旧链 (组件+hook+i18n+IPC+测试)。其中最隐蔽的模式是'测试保活': 死代码各自有绿测试 (asset-guide-panel/pricing convert/parsers.test 假覆盖), CI 永远绿, 掩盖死亡事实。死代码扫描工具 (knip/ts-prune) 对本仓多入口+双 tsconfig 结构零配置失配, 需要适配后入 CI 才能阻止再沉积。本主题全部条目已对抗验证, 可作为纯减法批次安全执行, 合计 ~1100 行产线代码 + 24 个 i18n key ×2 + 3.56MB 资源。

##### R9 · medium · `renderer-dead-vertical-slices`

**渲染层 ~900 行死代码纵切片 (4 个 shared 孤儿组件 + guidance 旧代整簇 + settings 本地源区块 + 死 hook), 部分由专属测试维持 CI 绿色**

- 文件: `src/renderer/src/components/shared/asset-card.tsx` · `src/renderer/src/components/shared/asset-guide-panel.tsx` · `src/renderer/src/lib/asset-guidance.ts` · `src/renderer/src/components/settings/local-sources-section.tsx` · `src/renderer/src/hooks/use-ipc.ts`
- 全部已对抗验证: AssetCard/StatCard/TabGroup (148 行, 2026-05-28 后未触碰) 零引用; asset-guidance(188)+asset-guide-panel(131) 整簇被 feature-guidance/feature-guide-panel 取代, 仅靠 2 个测试文件保活; LocalSourcesSection(295)+useScanSources 是 GH-85 改版遗留 (归档 SPEC 明确计划移除), 连带独占 i18n key 家族; 死代码有绿测试掩盖死亡事实并误导贡献者以为共享实现存在。边界: assets:scan-sources channel 本体仍活 (scope-switcher 直调); local-source-copy.ts 活但错位在 settings 目录。
- 建议: 删 5 个文件 + useScanSources + 对应测试与独占 i18n key; local-source-copy.ts 迁到唯一消费者旁; 删除批次过 vitest 全量 (theme-palette 等断言需同步) 与 harness:check。

##### R21 · medium · `store-dead-fields`

**stores/app.ts 五处死状态 (recentSessions/usageSummary/agentDetected/setScanning/lastAssetRefreshAt), scanning 是 assetRuntimeStatus 的反规范化副本, AppState 虚胖 ~24%**

- 文件: `src/renderer/src/stores/app.ts` · `src/renderer/src/pages/capabilities.tsx` · `src/renderer/src/pages/instructions.tsx`
- 已对抗验证 (含 getState/setState 动态路径排除): 三组字段零读零写, setScanning 零调用 (scanning 读者存在但纯派生自 runtimeStatus.state, sidebar-scan-status 已示范规范形式), lastAssetRefreshAt 三处写零读。store 与 hooks 缓存的职责分界事实上已收敛 ('store 只放资产快照+全局 UI 态'), 这些是收敛前残留; 与已立案 agent-view-store-vestige (#5) 同性质, 可同批清理。
- 建议: 删三组字段+action 与 setScanning, scanning 改读处派生; 同步收缩 app-store.test 与 capabilities-plugins/scanning-empty 两个测试的 setState 字面量。

##### R22 · medium · `i18n-dead-keys`

**i18n 死 key 24 个 (en/zh 双份, 改版遗留) + zh 复数约定混用 9 组不对称**

- 文件: `src/renderer/src/i18n/locales/en.json` · `src/renderer/src/i18n/locales/zh.json`
- 已对抗验证 (全 key 字面量 + 50 个动态模板前缀枚举 + replace 推导逐一排除, evidenceHelp 假阳性已剔除): nav.configuration/instructions.title/capabilities.title/usage.totalSpent 等 24 个 key 双语死亡; en 用 _one/_other 而 zh 混用裸 key 与 _other, 9 组结构不对称是维护噪音。注意 i18n locales 是 churn 榜首 (23 commits, 3 个 verify 任务在写), 删除需先确认无并行写入。
- 建议: 删 24 key 双份; 把隐式 key 推导 (replace('.evidence.','.evidenceHelp.')) 列入巡检脚本豁免规则; zh 复数收敛到 _other 单一约定。

##### R23 · medium · `pricing-convert-orphan-twin`

**engine/pricing/convert.ts 运行时零消费者, 真实转换逻辑是生成脚本里的同名 JS 重实现且已语义分叉 — 单测守护死代码, 生产路径无测试**

- 文件: `src/main/engine/pricing/convert.ts` · `scripts/update-pricing-catalog.mjs` · `tests/unit/pricing.test.ts` · `src/main/engine/pricing/catalog.ts`
- 已对抗验证: convert.ts 三函数在 src 运行时零消费 (usage.ts 只取 catalog/estimate 之外的入口), 唯一消费者是单测; 生成 catalog.generated.ts 的 mjs 脚本维护同名独立副本, 且漂移已发生 — mjs 版有 builtInAliases 与 toLowerCase 兜底而 TS 版无, 即单测断言的版本与生产语义已不一致。estimate.ts/getBuiltInPricingCatalog/URL 常量同状态; handlers.ts:45 还绕过 barrel 深路径 import。
- 建议: 脚本经 node 24 原生 type stripping (或 tsx) 直接 import TS 实现消除副本; 或删 TS 版三函数、测试改校验 catalog.generated.ts schema; URL 常量留一份, handlers 深路径 import 收回 barrel。

##### R34 · low · `long-tail-orphan-inventory`

**长尾孤儿清单 (全部已对抗验证): 死导出 9 处、JSON snapshot-store、复数版 hooks 状态残段、CSS 死 token、3.56MB 未接线图标、components.json、builder 死配置簇**

- 文件: `src/main/adapters/claude-code/parsers.ts` · `src/main/engine/assets/snapshot-store.ts` · `src/main/engine/hooks-manager.ts` · `src/renderer/src/styles/globals.css` · `tailwind.config.ts` · `assets/icon/app_icon.png` · `components.json` · `electron-builder.yml`
- 明细见 orphansConfirmed。删除注意事项 (验证时发现): snapshot-store 的 stripRaw 被 sqlite store 运行时消费不能整文件删; tokenUsageTotal 删除需同步降级其测试; assetProjectPath 同 export 行有活符号只能摘名; globals 死 token 删除需同步删 theme-palette.test.ts:29 断言; getAgentHooksStatuses 是 a471ed2 刻意退役后的引擎层残留 (含 d.ts 幻影/陈旧 mock/死 i18n key), 直接补完清理无需再议产品意图; components.json 删除时一并修正 README 两处过时的 shadcn 声明。
- 建议: 作为一个清理批次执行 (纯减法), 每项连带测试/mock/i18n/README 同步; 过 vitest 全量 + build + harness:check; 图标项二选一接线到 build/icon 或删除。

#### 主题: 渲染层复用与页面结构

> 渲染层分层骨架健康 (import 方向干净、仅 3 条反向边、GH-105 入口纪律成立), 问题集中在抽象层断代: 第一代 shared 抽象 (AssetCard/StatCard/TabGroup) 死亡后没有立二代, 页面各自手搓, 同语义在 3-13 个文件重复并开始漂移 (资产卡 4 克隆、指标瓷砖 6 实现、节标签 33 处 9 种写法、SWR 缓存 5 份策略分叉); ui barrel 按愿望铺面未阻止绕行, HeroUI 等价物在册而页面手搓。缺的是一层明确的二代抽象: ExpandableAssetCard/StatTile/SectionLabel/ActionChipButton/useCachedResource/useVisibleAssets, 加上 shared/ 准入规则。巨石页 (session-detail/capabilities) 的 ~400 行内联纯逻辑下沉 lib 后可直测, 其中凭证 redaction 正则关乎安全边界必须补枚举测试。

##### R8 · high · `expandable-asset-card-clones`

**可展开资产卡片 4 处严格克隆 (~330 行) 且已漂移 (两页 scope badge 样式不一致), 而 shared/AssetCard 抽象本体是孤儿**

- 文件: `src/renderer/src/pages/instructions.tsx` · `src/renderer/src/pages/capabilities.tsx` · `src/renderer/src/components/shared/asset-card.tsx`
- 已对抗验证: MemoryCard/SkillCard/GenericAssetCard (instructions) 与 McpServerCard (capabilities) 共享逐字相同脚手架 (外壳 className/FOCUS_HIGHLIGHT/chevron 三元/PluginOriginBadge 槽/focused→展开 effect/DetailRow+ViewRawButton 尾部); 3 份 Show-in-Explorer 按钮 JSX 含 handler 逐字相同; ScopeBadge 覆写串在 instructions 重复 6 处而 capabilities 裸用 — 漂移已产生用户可见不一致。chevron 三元实测 8 处 (修正已立案 heroui-followup 的 4 处口径)。第一代抽象 shared/asset-card.tsx 零引用, 共享层有名无实。
- 建议: 以 instructions 三卡为基建 shared/ExpandableAssetCard (icon/title/badges/meta/expanded children + focused 内置, DetailRow+ViewRawButton+ShowInExplorer 默认尾槽), 四处收敛后删孤儿 AssetCard; 与已立案 heroui-migration-followup 的 chevron 项合并执行, 避免同区域两次重构。

##### R13 · medium · `swr-hook-convergence-scope`

**useCachedResource 收敛 (已立案: renderer-cached-resource-hook) 范围扩大: 第 5 份副本已出现且策略分叉, 须同时带上错误维度、normalize 单点与统一测试 reset**

- 文件: `src/renderer/src/hooks/use-ipc.ts` · `src/renderer/src/hooks/use-memory.ts` · `src/renderer/src/hooks/use-agent-teams.ts` · `src/renderer/src/pages/usage.tsx` · `tests/setup.ts`
- 已立案 issue 的四项新证据: (1) GH-114 的 use-agent-teams 复刻出第 5 份 module cache 五件套, 各份失效策略已分叉 (teams 无 TTL/plugins 靠 snapshotId/sessions TTL+signature/health TTL 无 signature); (2) 同层 7 个 hook 错误语义分裂 — 3 个有 error state、其余 8 处 .catch(()=>{}) 吞掉, 最重者 use-ipc.ts:214 初始 status/snapshot 失败时整应用停 idle 静默空转; (3) usage.summary 双轨消费: 页面内联版过 normalizeUsageSummary 而 hook 版裸用, overview 吃裸数据, 两页对 IPC 载荷信任判断相反; (4) 测试正确性依赖 4 个分散的 reset*ForTests, 抽象不带统一 reset 会引入跨测试缓存污染。
- 建议: 抽象内建 {error, retry} + 共享 onIpcError(scope,err) + 单一 resetAllCachesForTests; 内部统一过 normalize; costMode/loadError/reload 合入 useUsageSummary 后 usage/overview 同走 hook; 动手前先写 5 份副本行为差异表并为每个差异补钉行为测试, 以 use-agent-teams (最简形) 为首个迁移对象。

##### R16 · medium · `renderer-god-pages`

**页面巨石与纯逻辑内联: session-detail 1593 行 (~200 行可单测信号/格式器函数) 与 capabilities 1054 行 (statusLine 视图模型 + 凭证 redaction 正则), 加两页逐字重复的过滤管道与 GH-113 骨架判定**

- 文件: `src/renderer/src/pages/session-detail.tsx` · `src/renderer/src/pages/capabilities.tsx` · `src/renderer/src/pages/instructions.tsx` · `src/renderer/src/lib/capability-assets.ts`
- session-detail 内联 buildSessionSignals/格式器群/duration 过滤/工具分类 ~200 行无 React 依赖函数, 只能经渲染间接测; capabilities 六个 section 抽取程度不一 — hooks 独享 1541 行视图组件 + 630 行 lib, statusLine 整套视图模型与 redactStatusLineCommand 凭证脱敏正则 ('凭证不进渲染进程'边界的最后一道 UI 防线) 留在页面且无边界 case 直测。filterAssetsByAppScope(filterAssetsByAgentView(...)) 管道与 scanning||idle 空态判定在 capabilities/instructions 逐字重复, 漂移即两页空态策略不一致。
- 建议: 纯逻辑迁 lib/session-signals.ts + lib/status-line.ts 补直测 (redaction 正则必须有枚举测试); statusLine 块迁 components/capabilities/ 与 hooks section 模式对齐; 建 hooks/use-visible-assets.ts 收敛过滤管道与骨架判定并补一条语义锁测试。

##### R24 · medium · `design-system-adoption-gap`

**ui barrel 63 导出仅 20 被消费 (68% 死面), motion.ts 整模块零引用; 页面在手搓 Card/Switch/Tooltip/Skeleton 的等价物 — 入口纪律成立但未阻止绕行 (已立案: heroui-migration-followup 补充量化)**

- 文件: `src/renderer/src/components/ui/index.ts` · `src/renderer/src/components/ui/motion.ts` · `src/renderer/src/pages/settings.tsx` · `src/renderer/src/pages/session-detail.tsx` · `src/renderer/src/components/shared/floating-popover.tsx`
- re-export 面按愿望铺设: Card 全家零消费而页面手搓 33+ 处卡片壳; Switch 零消费而 settings 手搓 role=switch Toggle; Tooltip 零消费而 session-detail 3 处 group-hover 手搓 CSS tooltip (固定宽度/无翻转/无 Escape, 行为最差) 与 FloatingPopover/HeroUI Tooltip 三方并存; NoticePanel 与已在用的 HeroUI Alert 重叠, warning-banner 是 11 行误命名别名; motion token 零采纳。
- 建议: re-export 收缩到实际使用集 + 明确近期采用项; 3 处 CSS tooltip 迁 FloatingPopover (或启用 HeroUI Tooltip 后二选一删另一个); settings Toggle 换 Switch 作首例验证; notice-panel 内部改基于 Alert; 删 warning-banner; 并入已立案 #6 执行。

##### R25 · medium · `micro-primitives-missing`

**三个微 primitive 缺位: 指标瓷砖 6 处独立实现、uppercase 节标签 33 处 9 种写法、outline 操作按钮样式串 10 处 + shell.openPath 逻辑 8 文件重复**

- 文件: `src/renderer/src/pages/overview.tsx` · `src/renderer/src/pages/session-detail.tsx` · `src/renderer/src/pages/usage.tsx` · `src/renderer/src/components/shared/file-viewer-button.tsx` · `src/renderer/src/components/shared/stat-card.tsx`
- 同一视觉语义无统一来源: 指标瓷砖 (小标签+tabular-nums 数值) 6 个并存实现, 字号/底色/字距各不相同, 第 7 个是孤儿 stat-card; 节标签 33 处散落 13 文件, 字号在 text-[10px]/[11px]/xs 间漂移 (是已立案 #6 中 102 处残留的最大来源); outline 小按钮 className 串 10 处仅 1 处组件化, '在访达中显示' 逻辑 8 文件各写一遍。每新增一页统计 UI 都会再造一份。
- 建议: 新建 shared/StatTile、shared/SectionLabel (一行收敛字号字距)、shared/ActionChipButton + ShowInExplorerButton (封装 shell.openPath); 机械替换后顺带消化约 1/3 的 text-[10px]/[11px] 残留; 注意 usage/overview 是 gh-103 在途足迹, 等收口或避开 chart 区。

##### R26 · medium · `set-assets-fold-bypass`

**project-scope-switcher 经 setAssets 裸写资产, 绕开 store 自我声明的 GH-113 foldKeepingShallow 防闪烁不变量 — setAssets/setStats 全库唯一调用方就是这条绕行**

- 文件: `src/renderer/src/stores/app.ts` · `src/renderer/src/components/layout/project-scope-switcher.tsx`
- app.ts 注释声明 'Both write paths use this so they can't diverge', 但 selectScope 激活项目时存在第三条写路径: setAssets 裸替换 (无 fold, deep-only 集会瞬时丢 shallow 资产) 后又 setAssetSnapshot 二次覆写 — 同一动作两次写入两种合并语义。
- 建议: selectScope 删 setAssets/setStats 两行只走 setAssetSnapshot 单落点; 随后从 AppState 删除这两个 action, 使不变量在类型层不可绕过。

##### R32 · low · `renderer-dir-semantics-misplaced`

**渲染层目录语义错位: 全部 3 条反向 import 边 (settings '页面'实为对话框内容、memory-view 880 行事实页面住 components、local-source-copy 自建双语字典被 layout 消费) + shared/ 准入语义倒置**

- 文件: `src/renderer/src/pages/settings.tsx` · `src/renderer/src/components/memory/memory-view.tsx` · `src/renderer/src/components/settings/local-source-copy.ts` · `src/renderer/src/components/shared/category-jump-nav.tsx`
- pages/settings.tsx 无路由, 唯一消费者是 layout/settings-dialog (附带: advancedMode 开关零消费者, 建议入 docs/issues); memory-view 自注册 page-chrome 形成 feature→layout 边, 与 HooksLifecycleView 受控形态并存两种契约; local-source-copy 216 行自建 EN/ZH 字典绕过 i18next 是唯一平行翻译机制; category-jump-nav/token-spark-bar/asset-count-chip 三个 sessions 专属件住 shared/ 而真正跨页模式没抽。
- 建议: SettingsContent 移 components/settings/ 删伪页面; memory-view chrome 注册上提回 instructions 页 (改动小); 字典迁 en/zh.json 的 sources.* 前缀; sessions 三件迁 components/sessions/ 或 shared/ 加准入注释 (2+ 消费者)。

#### 主题: 错误处理与可观测性

> 架构里三套错误记账机制 (ScanError/HealthCheck/manifest.errors) 设计完整且 UI 可达, 但被两类缺口架空: 其一, 主进程零日志零进程钩子, 打包应用 (无终端) 下启动失败/watcher 故障/未捕获异常完全无痕迹, stack 在 runtime 一跳即永久丢失; 其二, 既有机制被自己的下一层短路 — parser 内层裸 catch 先行吞错使外层 safeScan 永收不到 throw, 错误与空数据同形 (坏 .mcp.json 资产无声消失、detect 异常冒充'未安装'、pricing 损坏成本归零)。修复不需要新机制: 一个 log(scope,err) seam (落 userData 本地, 守住无遥测边界) + 删内层 catch 让既有记账接管 + status.error 接到 UI, 4-5 个文件覆盖 ~80% 吞错面。

##### R5 · high · `zero-observability-main`

**主进程零日志 + 零进程级兜底: 打包应用故障无任何痕迹, whenReady 链无 catch, watcher 无 error 监听**

- 文件: `src/main/index.ts` · `package.json` · `src/main/engine/watcher.ts` · `src/main/engine/assets/watch-wiring.ts`
- 已对抗验证: src/main 全域 console.* 为 0, 无任何日志依赖, 无 uncaughtException/unhandledRejection/render-process-gone 钩子; 全应用仅 2 个 console.error (仅包 /usage 的 boundary + preload expose 失败)。whenReady().then 无 .catch — 启动期 throw 表现为 dock 图标出现但永远无窗口、零诊断信息; chokidar watcher 仅监听 add/change/unlink, emit('error') 无监听者时直接 throw 进 uncaughtException 且 live 更新静默失效; applyWatchEvent 回调无 try/catch。worker 段是全应用唯一系统性兜底。
- 建议: src/main/index.ts 单点落地: 进程双钩子写 userData/logs 滚动文件 (~50 行自写或 electron-log, 守住无遥测边界只落本地)、whenReady 补 .catch + dialog.showErrorBox、watcher.on('error')、listener 包 try/catch, 并导出 log(scope, err) seam 供各 catch 注入。

##### R19 · medium · `error-silencing-cluster`

**吞错与降级不可观测簇: 内层 catch 饿死既有 ScanError 记账 (坏 .mcp.json 资产无声消失)、detect 异常冒充'未安装'、status.error 消息零渲染且 stack 在 runtime 跳丢弃、SQLite 持久化首败永久放弃零痕迹**

- 文件: `src/main/adapters/claude-code/parsers.ts` · `src/main/adapters/claude-code/scanner.ts` · `src/main/engine/scanner.ts` · `src/main/engine/assets/runtime.ts` · `src/renderer/src/components/layout/sidebar-scan-status.tsx` · `src/main/engine/assets/sqlite-snapshot-store.ts`
- 记账 seam 本身完整且 UI 可达, 问题是被自己的下一层短路: parseMcpServers 等内层裸 catch 先行 return [], 外层 safeScan 永收不到 throw, 用户写坏一个 .mcp.json 则 MCP server 从所有页面消失且计数为 0 (scanner.ts:60 自家注释明文反对此模式); getScanSourceGroups 把 detect() 异常折叠成 installed:false 的肯定性错误结论; 故障链最后一跳 — status.error 全 renderer 零渲染, stack 在 runtime 转换处永久丢失; pricing catalog 解析失败成本静默归零、SQLite 首败后冷启动秒开永久失效仅表现为'变慢'。
- 建议: 纯删代码级修复: 删 parsers 内层 catch 让 throw 上抛给已包好的 safeScan; detect 失败 push ScanError 区分'未安装/检测失败'; runtime catch 处落日志 (单点覆盖全部扫描故障) + ScanProgressPanel 渲染 status.error; 长尾 catch 各注入一行 log(scope, err), pricing catalog 失败升级为记账。

##### R27 · medium · `error-boundary-single-route`

**PageErrorBoundary 仅包 /usage 一条路由: 其余 7 页 (含断言最密的 session-detail/capabilities) 渲染异常直接整窗白屏, 桌面应用无刷新入口只能重启**

- 文件: `src/renderer/src/App.tsx` · `src/renderer/src/main.tsx` · `src/renderer/src/components/layout/page-error-boundary.tsx`
- React 未捕获渲染错误卸载到根; main.tsx 根部无 boundary; 对 asset.meta 做 as 断言最多的页面任何一次渲染异常即白屏。通用 boundary 已存在且支持 titleKey/bodyKey, 推广成本仅是包装位置。
- 建议: AppLayout children 外加默认 PageErrorBoundary 整窗兜底, 高复杂页按 /usage 模式逐路由细化; boundary 加 '返回 Overview' 动作避免死局; boundary 的 console.error 接入统一 log seam。

##### R28 · medium · `activate-stale-push-listeners`

**macOS activate 重建窗口后 assets:changed/assets:progress 推送仍绑定已销毁的首窗口, 新窗口实时性静默失效 (产品 bug, 建议入 docs/issues)**

- 文件: `src/main/index.ts`
- watcher.setListener 与 setProgressListener 闭包捕获 whenReady 时的首窗口; mac 关窗不退出, Dock 激活新建窗口后两个推送监听器仍指旧窗口, isDestroyed 守卫只防崩溃不重绑 — 新窗口能拿初始快照 (拉模式) 但收不到增量与进度推送。静态接线事实确定, 用户可感知度未实测。
- 建议: 推送改遍历 BrowserWindow.getAllWindows() 广播或建 listener registry; activate 分支复用同一接线函数; 按项目惯例先立 docs/issues 再修。

#### 主题: 打包分发与安全基线

> 打包与安全配置停留在脚手架时代, 与产品已到 0.1.x 可分发形态脱节: dependencies 语义混乱使 asar 携带 98 包死代码且下次打包膨胀 ≥20MB; files 黑名单让 website 源码与内部 AI 工作流配置进分发包 (信息外泄); 签名链/fuses/publish 全部 inert 或出厂默认, 对一个自述'只读扫描凭证相关资产'的工具, RunAsNode 借壳与 asar 篡改是具体的本机威胁。窗口装配层缺集中策略 (sandbox 无必要回退、URL 放行三入口无白名单、无导航守卫) — 注意 url-guard 的高危 exploit 链已被对抗验证证伪 (manifest 层已强制 https、evidence URL 是硬编码闭集), 这些是 defense-in-depth 加固而非在火漏洞, 可按两批落地: 窗口层 (sandbox+url-guard+navigation, 改动小) 与分发层 (白名单+fuses+ABI 冒烟+签名)。

##### R6 · high · `renderer-deps-misplaced`

**7 个纯 renderer 库误放 dependencies, 被整套塞进 asar 成永不可达死代码; HeroUI 迁移后下次打包死重 ≥20MB (实算闭包 77.5MB)**

- 文件: `package.json` · `electron.vite.config.ts` · `electron-builder.yml`
- 已对抗验证 (asar 提取实算): renderer 库由 vite 全量 bundle, 运行时不需要 asar node_modules, dependencies 正确语义是 main/preload 运行时依赖 (实证最小集 8 包已齐)。@heroui/react/framer-motion/i18next/react-i18next/react-markdown/remark-gfm/zustand 7 包混入后, 0.1.1 已带入 98 包 2.75MB 死代码; react 在 devDependencies 不进包而应用正常运行, 证明 100% 不可达。@heroui+framer-motion 完整 production 闭包实算 265 包 77.5MB, 下次打包膨胀远超 20MB 下限估计。
- 建议: 7 包移到 devDependencies (vite bundle 行为不变), dependencies 收敛为 better-sqlite3/chokidar/glob/js-yaml/minisearch/smol-toml/@electron-toolkit 两包; 改后 asar list 验证只剩最小闭包。

##### R7 · high · `builder-files-blacklist-stale`

**electron-builder files 黑名单停留脚手架时代: website 源码/harness 脚本/.agents/.claude/lock/tsbuildinfo 全进分发包 (内部信息外泄 + 16% 体积), 下次再加 assets 3.4MB + packages 3.2MB**

- 文件: `electron-builder.yml`
- 已对抗验证 (asar list 逐项核实): 0.1.1 包内含 /website 278 entries 2.43MB (独立产品完整源码)、/scripts 12、/.agents 38、/.claude 22 (内部 AI 工作流配置)、双 lock 文件、tsbuildinfo、全套构建配置; 黑名单是减法模式, 维护成本随仓库增长线性上升, 且含 4 个指向不存在文件的死条目而真实存在的 eslint.config.mjs 反而进包。对外分发的桌面应用携带内部工作流与脚本属信息外泄, 不只是体积问题。
- 建议: files 改加法白名单 ['out/**', 'package.json', 'LICENSE'] 一次性终结腐蚀模式; 删除死排除条目; 改后 asar list 对比验收。

##### R10 · high · `electron-window-hardening`

**窗口装配层加固缺位: sandbox:false 无必要回退、URL 放行三入口无协议白名单、无 will-navigate/permission handler、shell 通道无路径校验**

- 文件: `src/main/index.ts` · `src/main/ipc/handlers.ts` · `electron.vite.config.ts` · `src/renderer/index.html`
- sandbox 项已对抗验证: preload 96 行仅用 contextBridge+ipcRenderer 完全沙箱兼容, 唯一障碍是 externalizeDepsPlugin 使 @electron-toolkit/preload 走外部 require, 两行配置即可恢复 Electron 20+ 默认。url-guard 项经验证降级 (high→low/medium): reference.url 已被 manifest 层强制 https、evidence.url 是硬编码常量闭集, '第三方元数据一键 file://' 的 exploit 链证伪; 但 setWindowOpenHandler 与 shell:openExternal 对任意字符串直通仍是真实的 defense-in-depth 缺口。另缺 will-navigate 守卫 (拖拽文件可替换 SPA 为 file:// 内容)、permission handler (默认全放行, 合法集合为空)、CSP 次级指令; shell:openPath 是'扫描路径白名单'边界上唯一不校验的出口。
- 建议: sandbox: true + preload exclude 打包 (优先, 收益/成本比最高); 新建 main/url-guard.ts 单点: openExternal 限 https?/mailto, openPath 限扫描根集合, setWindowOpenHandler 共用; will-navigate 一律 preventDefault; permission handler deny-all; CSP 追加 object-src/base-uri/form-action。

##### R31 · medium · `distribution-hardening-inert`

**分发链加固全 inert: mac 签名链配置指向不存在文件 (产物保留 Identifier=Electron 不过 Gatekeeper)、fuses 全出厂默认 (RunAsNode/NODE_OPTIONS/inspect 开、asar 无完整性校验)、better-sqlite3 ABI 正确性依赖一年前的缓存二进制无校验**

- 文件: `electron-builder.yml` · `package.json` · `dist/builder-debug.yml`
- entitlementsInherit 指向不存在的 build/entitlements.mac.plist, notarize:false, 无 identity — 签名步骤整体跳过, TCC 权限将归属 'Electron' 而非 Berth; fuses 默认使 Berth 二进制可被 ELECTRON_RUN_AS_NODE 借壳 (凭证读取行为归因到 Berth 进程名)、NODE_OPTIONS 注入、本地篡改 asar 持久化注入; npmRebuild:false 下 ABI 正确性来自 2025-05 一次性编译 + pnpm 缓存的全隐式链, Electron 跨 ABI 升级时坏二进制会零报错进包且 mac 打包链无启动冒烟。
- 建议: package script 在 builder 前插 ABI 冒烟 (项目 electron 加载 better-sqlite3 + new Database(':memory:'), ~10 行); afterPack 接 @electron/fuses 关 RunAsNode/NODE_OPTIONS/inspect、开 OnlyLoadAppFromAsar; 签名/notarize 走分发前补齐或显式删除 inert 配置对齐事实; 链路记入 AGENTS.md BUILD_ENV。

### 已验证孤儿清单 (20 项, 全部经对抗验证, 可作纯减法批次)

1. **文件: src/renderer/src/components/shared/{asset-card,stat-card,tab-group}.tsx (148 行, 第一代 shared 抽象)**
   - 验证: 双工具 (knip+ts-prune) 命中后人工穷尽: 裸符号 (AssetCard/StatCard/TabGroup/TabDef) + 路径片段 + @/ 别名跨 src/tests/packages/website/全配置 grep 仅定义行; 无 barrel/lazy/动态 import; instructions 的 GenericAssetCard 与 data-testid 为同名巧合已排除; 三文件唯一 commit 51979bd (2026-05-28)。
2. **文件簇: src/renderer/src/components/shared/asset-guide-panel.tsx + src/renderer/src/lib/asset-guidance.ts (~319 行) + 保活测试 asset-guide-panel.test.tsx / asset-guidance.test.ts**
   - 验证: 生产消费者为零 (panel 仅被自身测试引用, guidance 唯一 src 消费者是孤儿 panel); 活体同名符号全部 import 自 lib/feature-guidance (同名不同源); 归档 SPEC (2026-05-31-guidance-surface-unification) 证实取代关系; 连带死 i18n key instructions.guidance.docs.codexConfig。
3. **文件: src/renderer/src/components/settings/local-sources-section.tsx (295 行) + 导出: useScanSources (src/renderer/src/hooks/use-ipc.ts:469) + 独占 i18n key 家族 settings.sourceCategories/sourceScopes/scanDirectories/sourceDetected**
   - 验证: LocalSourcesSection 与 useScanSources 全仓各仅 1 命中 (定义处); 动态 i18n 模板拼接点逐一核对唯一引用在死组件内; settings 测试显式断言 scanSources 不再被页面调用, GH-85 归档 SPEC 明确计划移除 — 改版遗留定性成立。边界: assets:scan-sources channel 本体仍活 (project-scope-switcher 直调), 不可删 main/preload 侧。
4. **store 字段: src/renderer/src/stores/app.ts 的 recentSessions/usageSummary/agentDetected (零读零写)、setScanning (零调用, scanning 为派生副本)、lastAssetRefreshAt (三写零读)**
   - 验证: 全仓穷尽含无扩展名过滤复查; 动态路径排除 (src 唯一 getState 在 use-ipc.ts:209 读 assetRuntimeStatus, 测试 setState 字面量不含这些 action); overview 实际走 useSessions/useUsageSummary hook 自取; i18n key 't(overview.recentSessions)' 撞名已排除。
5. **IPC 全链死通道: theme:get / hooks:status / hooks:set-enabled / assets:scan-all (handler+preload+d.ts 三件套存活, renderer 零调用)**
   - 验证: 通道名字符串全仓 grep 仅命中三件套与 docs 历史文档; renderer 全量 window.api 引用逐一核对 (theme 仅 .set, hooks 仅 .setHookEnabled, assets 无 .scanAll); 间接形态 (解构/动态字符串/绕桥) 排除; 归档文档佐证遗留成因 (GH-10 主动移除调用点保留通道)。
6. **IPC handler-only 不可达通道: assets:relations / assets:import-chain / mcp:merged + 连带死逻辑 computeMcpMerged (handlers.ts:510-548) 与 MCPMergeInfo 类型 (ipc.ts:279-286)**
   - 验证: preload 无对应 wrapper, contextIsolation 下 renderer 无 ipcRenderer/window.electron 逃逸路径 (全仓零使用); engine/relations.ts 生产 import 仅剩死 handler, 测试可达; instructions 页的 importChain UI 渲染的是 asset.meta.imports 非通道消费 — 干扰项已排除; GH-112 归档文档自佐证渲染层改用客户端过滤。
7. **preload phantom: window.api.assets.scan → 'assets:scan' (src/preload/index.ts:30, 无 handler, 调用必 reject) + d.ts:54 声明 + tests/setup.ts:71 mock**
   - 验证: 精确字符串 'assets:scan' (排除 scan-all/scan-sources 子串) 全仓唯一出现于 preload:30; handlers 35 个注册与 IpcChannels 类型表均无该通道; renderer/tests/packages 零调用方。
8. **契约类型: IpcChannels (src/shared/types/ipc.ts:389) 与 IpcEvents (:425) 零引用, 含幽灵事件 'scan:progress'**
   - 验证: 裸符号全仓 grep 各仅 1 处命中即定义行; preload/handlers 均只 import payload 类型不从表派生; 独立复算集合 diff 确认表缺 3 现役通道 (snapshot/status/refresh)、含 3 死通道; scan:progress 全仓唯一出现处即声明行, main 无 send、preload 无订阅。
9. **运行时孤儿: src/main/engine/pricing/convert.ts 三函数 (convertLiteLlmPricingCatalog/convertModelsDevCatalog/loadLocalPricingOverrides)**
   - 验证: 穷尽搜索: 引用仅定义 + barrel re-export + 单测 + docs 归档, 无动态 import/别名/传递消费 (catalog/estimate/model-match 内部均不 import convert); 生产路径是 scripts/update-pricing-catalog.mjs 的同名 JS 副本 (package.json pricing:update 确认), 且两版已语义分叉 (mjs 有 builtInAliases 与 toLowerCase 兜底) — 单测守护的是没人运行的版本。
10. **实现: JSON 版 createSnapshotStore (src/main/engine/assets/snapshot-store.ts:22)**
   - 验证: 生产装配 (main/index.ts:131) 无条件用 createSqliteSnapshotStore, 无 fallback 路径; createSnapshotStore 唯一非定义引用是自身单测。注意: 同文件 stripRaw 被 sqlite-snapshot-store.ts:5 生产消费, 删除时必须迁移 stripRaw 不可整文件删; docs/issues 已记录'备用后端'决策但无任何装配代码。
11. **导出: getAgentHooksStatuses 复数版 (src/main/engine/hooks-manager.ts:50) + preload/index.d.ts:89 幻影 statuses + 陈旧 mock (tests/setup.ts:127, hooks-lifecycle-view.test.tsx:203) + 死 i18n key projectReadOnly**
   - 验证: 活消费者仅自身单测 (裸符号/路径/字符串变体穷尽); 私有 project 级函数未导出, 整条能力随之死亡; git 考古修正成因 — 28581d7 曾完整接线, a471ed2 (legacy-scanner issue) 刻意退役接线层但引擎层未清, 属退役残留而非未完成功能。
12. **死导出 9 处: parsePlugin/parseStatusline (claude parsers.ts:648/676)、resolveCodexHomeDir 转发 shim (codex/index.ts:293)、useMemoryNote (use-memory.ts:127)、flattenNavItems (nav-config.ts:169)、AppScopeMode (scope.ts:3)、tokenUsageTotal (token-usage.ts:124, 仅测试)、ExitCode (scan-engine cli-args.ts:17)、assetProjectPath 别名 (project-scope.ts:10)**
   - 验证: 逐项裸符号全仓 grep = 仅定义行 (全仓无 export * 链故符号 grep 即穷尽); 字符串形式零命中; 注意事项: tokenUsageTotal 删除需同步降级其测试为内部 helper; assetProjectPath 同 export 行的 assetMatchesProjectPath 有活消费者只能摘名; 删 codex shim 需同步清理其 import-rename。
13. **i18n key: 24 个死 key (en/zh 双份) — nav.configuration, instructions.title, capabilities.title, usage.totalSpent, sessions.noSessions, settings.agentPluginManifestStatus.{valid,invalid,incompatible}, common.sensitive 等**
   - 验证: 对抗复核三通道穷尽: 全 key 字面量零命中 (子串撞名如 sessions.modelInfo.* 已区分); 全量枚举 t(`...${}`) 50 个动态前缀无一覆盖 (动态用的是 ManifestActivationStatus 而非被判死的 ManifestStatus); ${baseKey}.title 拼接的 baseKey 全为 *.guidance.* 不生成页面 title key; 无 keyPrefix/Trans/returnObjects 组键路径。evidenceHelp.* 的 replace 推导假阳性已剔除示范了人工复核必要性。
14. **资源: assets/icon/app_icon.png + app_icon_v2.png (合计 3.56MB)**
   - 验证: 全仓不限扩展名 grep ('app_icon'/'assets/icon'/'icon/' 路径片段) 零命中; electron-builder.yml 无 icon 字段、buildResources 指向不存在的 build/; BrowserWindow 构造无 icon 选项; git log --all 仅一个提交 (07d3556 'Add app icons') 后零接线; vite 无 publicDir 隐式打包路径。
15. **CSS/配置 token: globals.css --secondary 对 + --sidebar-accent-foreground (含 tailwind 映射), tailwind.config.ts accordion keyframes/animations (radix 遗留, 项目已无 radix 依赖), boxShadow card/card-dark**
   - 验证: 工具类全前缀形式 + var() 引用 + 动态拼接跨 src/tests/website/index.html 穷尽零使用; package.json 与 lockfile 无 radix (--radix-accordion-content-height 永不注入); HeroUI color='secondary' 零使用。删除时必须同步删 tests/renderer/theme-palette.test.ts:29 对死变量的字符串断言并跑 vitest。
16. **配置文件: components.json (shadcn CLI 生成器配置, 436B, 且随 0.1.1 进了分发包)**
   - 验证: 字符串 'components.json' 全 repo (含 packages/website/全构建配置) 零命中; 零 shadcn/radix 依赖; components/ui 仅 3 文件且为 GH-105 HeroUI re-export 体系; 误导效应已实际发生 — README.md:93/:170 至今仍声称 UI 栈为 shadcn/ui, 删除时一并修正。
17. **electron-builder 死配置簇: asarUnpack resources/** (目录不存在)、publish 块 https://example.com/auto-updates 占位 (已写入分发包 app-update.yml)、'!PLANS/*' (目录从未入库)**
   - 验证: ls/git log --all 证实 resources/ 与 PLANS/ 从未存在 (initial scaffolding 提交即有, 模板残留); electron-updater/autoUpdater 全仓零命中而 dist 产物 app-update.yml 实测含占位 URL; 实际 unpack 的 better-sqlite3 来自 smartUnpack 默认行为与该配置无关, 删除零影响。
18. **构建产物: packages/berth-scan-engine/dist/cli.js ESM 版 + cli.js.map (1.55MB 死产物对; maps 合计占发布物 70%)**
   - 验证: bin 只指 ./dist/cli.cjs, exports 无 './cli' 子路径 → ESM CLI 无任何入口可达; E2E 为 in-process import src 不碰 dist; 全仓与 docs 无 cli.js 引用; 附带验证 scoped 包无 publishConfig, 首次 npm publish 将 402 失败。
19. **依赖: dependencies 中 7 个 renderer-only 包 (@heroui/react, framer-motion, i18next, react-i18next, react-markdown, remark-gfm, zustand) → asar 内 98 包 2.75MB 永不可达死代码**
   - 验证: asar 提取 + 依赖闭包可达性实算: 从 main/preload 8 个真实运行时依赖出发可达 64 包, 死代码 98 包; react 本体在 devDependencies 不进包而应用正常运行 — 这批包的 peer require 必失败, 证明 100% 不可达; HeroUI 完整 production 闭包实算 265 包 77.5MB 将在下次打包进入。
20. **测试文件: tests/unit/parsers.test.ts (196 行假覆盖)**
   - 验证: 全文件唯一 import 是 vitest, 不触及任何 src 模块; 全部断言针对测试内联重写的 regex/JSON 副本, vi.mock('fs'/'glob') 从未作用于被测代码; 真实 parser 逻辑已由 claude-scanner/codex-*/session-meta-parser 四套测试充分直测 (低风险档, 未对抗验证但 import 事实静态可证)。

### 重构执行风险 (11 条)

1. 在途任务撞车 (最高优先): gh-103 仍在 implement, 其足迹 chart-colors.ts/globals.css/overview.tsx/usage.tsx/token-usage-display.tsx 随时回改 — globals.css 死 token 清理、metric-tile 收敛、usage/overview 相关重构必须等 gh-103 任务 6 收口, 或严格限定在非 chart 变量段并当轮声明。
2. i18n locales en/zh.json 是 churn 榜首 (各 23 commits, gh-94/98/104 三个 verify 任务在写): 删 24 个死 key 与 zh 复数收敛前先确认无并行写入, 改动按 key 前缀分批小步提交; 本仓多 Agent 共享主分支, 所有写操作限定自己处理过的文件并用 git diff --cached 核对 staged 集合。
3. 多任务汇聚文件避撞: top-navigation.tsx (4 任务 16 commits)、instructions.tsx/sessions.tsx/hooks-lifecycle-view.tsx/memory-view.tsx/session-detail.tsx (各 3-4 任务) — ExpandableAssetCard 收敛与 god-page 逻辑下沉直接落在这些 verify 足迹上, 任何 verify 回退都会冲突; 建议这两项排在 12 个 verify 任务关闭之后。
4. 已知方向矛盾: gh-98 verify 断言保留 Radix NavigationMenu 而 gh-105 P4.2 已移除 (category-jump-nav.tsx); gh-94 (删 teams) 的残留检查会被 GH-114 回加的 /teams 路由误报 (App.tsx/nav-config.ts/preload) — 触碰这些文件的重构先与对应任务态对齐, 不要替它们'修复'。
5. ipc/handlers.ts 同时是 gh-86/95/104 三任务 verify 足迹 + 全仓最大零直测块: session-detail 逻辑迁出前先按 session-activity.ts 先例抽纯函数补直测, 并加 channel 注册三方对账测试 (handlers/preload/IpcChannels/mock 四集合), 否则 IPC 收敛期的误删误改无网可接。
6. e2e 仅 windows CI 与主开发机 (mac) 脱节: 触及主进程装配 (runtime 组合根/worker 入口路径/IPC 注册/打包配置) 的改动在本地与 ubuntu CI 均无集成信号, 问题最早暴露点被推迟到 windows e2e job — 重构密集期先把 e2e 扩到 macos/ubuntu, 或每次装配类改动本地手动 pnpm build + test:e2e。
7. engine 迁包三个运行时风险点 (worker 产物路径 __dirname/asset-worker.js、better-sqlite3 Electron-ABI、electron-builder 布局) 全部在单测射程外: 迁移前必须先补 out/main/asset-worker.js 存在性断言 + 真 worker_threads 集成测试 + ABI 冒烟脚本 (~10 行); 31 处测试相对 import 用脚本批量改写并靠 917 用例回归; 验收以 scan-bridge + cli-e2e 黄金输出 diff 为基线。
8. 组件合并的网不均: file-viewer-drawer/floating-popover/filter-bar 等 10 个合并目标组件零直测 (focus-trap 类必须先测 Tab 循环与 Escape 再动); theme-palette/token-usage-display/scope-badge-palette 三个源码文本断言测试是重命名地雷, 对应组件被合并时改写为行为断言或删除, 不要带着字符串钉子做重命名。
9. 孤儿删除的连带同步: 每个删除批次必须同步清理保活测试 (asset-guide-panel/asset-guidance/snapshot-store/parsers.test)、setup.ts mock 键、hooks-lifecycle-view 的幻影 statuses mock、theme-palette 断言行、README shadcn 声明; stripRaw/tokenUsageTotal/assetProjectPath 三处有'不能整删'的细节 (见 orphansConfirmed); 全批次过 vitest 全量 + pnpm build + harness:check 后小步提交。
10. 安全硬边界在重构中不可破坏: 只读用户配置 (hooks-manager 是唯一合法写者, engine 迁包时留宿主, 包 README 维持 read-only 承诺); 凭证不进渲染进程 (capabilities 的 redactStatusLineCommand 下沉 lib 时先补正则枚举测试再动); 扫描路径白名单 (shell:openPath 校验应以扫描根集合为锚); 无遥测 (新增日志只落 userData 本地滚动文件, 不出网)。
11. 渲染层动态行为验证盲区 (memory: runtime-behavior-needs-real-run): SWR hook 收敛、setAssets 绕行修复、推送监听器重绑这类数据流/时序改动, 静态绿与单测绿证明不了可观测正确性, 必须真跑应用观察 (扫描进度推送/项目切换/增量折叠), mac 上用 CDP 截图配方验收。

### 与已立案 issue 的对应

| 已立案 issue | 本分析对应问题 | 增量 |
|---|---|---|
| 2026-06-09-IMPROVEMENT-engine-shared-core-package | R12 `engine-package-migration-scope` | 工料细化: 闭包 30 文件零阻断 + 4 个缺口 (hooks-manager 写能力 / typecheck 盲区 / CLI manifest drift / 运行时加载风险) |
| 2026-06-09-IMPROVEMENT-asset-runtime-collaborators-split | (无新问题) | runtime 拆分安全网被评为全仓最强 (24 用例 seam 级), 按已立案独立推进 |
| 2026-06-09-IMPROVEMENT-renderer-cached-resource-hook | R13 `swr-hook-convergence-scope` | 范围扩大: 第 5 份副本 (use-agent-teams) + 错误维度 + normalize 单点 + 测试 reset |
| 2026-06-09-IMPROVEMENT-shared-path-and-type-config | R30 `shared-pure-logic-forks` + R15 (路由三处硬编码) | 新证据: normalizeProjectPath 盘根分叉、签名习语伪相等风险 |
| 2026-06-10-IMPROVEMENT-agent-view-store-vestige | R21 `store-dead-fields` | 同性质同批: 另发现 5 处死 store 字段 |
| 2026-06-05-IMPROVEMENT-heroui-migration-followup | R8 + R24 + R25 | 量化: ui barrel 68% 死面、chevron 实为 8 处、节标签 33 处 9 种写法 |
| memory splitFrontmatter 残留 (engine-shared-core-package 内记录) | R14 `main-pure-helper-copies` | 扩面: isRecord ×7、frontmatter ×4、路径包含 4 套 2 算法语义矛盾 |

### 旁支产品问题 (本轮新立 docs/issues, 不进本任务主线)

- `2026-06-10-BUG-activate-stale-push-listeners.md` — mac activate 重建窗口后推送绑死旧窗口 (R28, 已亲自核验 src/main/index.ts:143-157)。
- `2026-06-10-IMPROVEMENT-settings-advanced-mode-inert.md` — settings 高级模式开关 inert (已亲自核验全仓 5 处引用)。

## 任务分类与 debt 校准

- type / maintenance.subtype: maintenance / architecture — 确认不变。
- source.kind / refs: user-request — 确认不变。
- debt estimate 修正: incurred 2→3 (批次多, 触及契约/打包配置, churn 上升), repaid 8→12 (实测 34 项问题, 预计偿还引擎域/IPC/渲染层复用/孤儿四条主线, 即 architecture area debt 27 的主要部分), net -6→-9。
- scope / risk / areas / confidence: global / high / [architecture] 不变; confidence low→medium (有实测数据支撑)。
- revision: 已追加 INDEX.md `debt.revisions[0]` (explore, 2026-06-10)。

## 验收标准

1. 分析完备: 本文档承载 34 项问题 (带 file:line 证据与验证状态)、20 项已验证孤儿、11 条执行风险、15 条现状底图。[explore 已完成]
2. 架构选型明确: 02-SPEC 给出目标架构模式 (基于现状底图论证, 非泛型套用)、分层图与依赖方向规则; 落地后同步更新 docs/ARCHITECTURE.md。
3. 范围裁剪显式化: 34 项中纳入本任务的在 03-PLAN 列为任务项; 不纳入的逐项落 docs/issues (新立或并入已立案), 不静默丢弃。
4. 孤儿收敛: 纳入范围的孤儿删除批次落地, 连带保活测试 / setup.ts mock / i18n key / README 声明同步清理; 遵守 stripRaw、tokenUsageTotal、assetProjectPath 三处"不能整删"细节; 每批 vitest 全量 + typecheck + lint + harness:check 绿。
5. IPC 契约单源: preload 类型从实现派生 (typeof api) 替代手写 d.ts; handlers/preload/契约表/测试 mock 四方对账测试落地; 死通道与 phantom 按 SPEC 决策清理。
6. 引擎域收敛: SPEC 决定的 adapter dispatch 收敛、扫描源表去 mirror、纯助手单源化逐项落地, 每项先写或更新目标测试。
7. 渲染层收敛: SPEC 决定的组件收敛 (ExpandableAssetCard 等)、useCachedResource、死 store 字段清理落地; 凭证 redaction 正则下沉前必须先补枚举测试 (安全边界)。
8. 可观测性 (纳入范围者): main 进程 log seam + 进程级钩子 + watcher error 监听 + 吞错簇修复; 新日志仅落 userData 本地 (无遥测边界)。
9. 行为保持验收: 重构均为行为保持型; 触及页面重构前后截图对比, loading/empty/error/data 四态与暗色不回归; 数据流/时序类改动 (SWR 收敛 / setAssets 绕行修复) 必须真跑应用观察 (CDP), 不以静态绿替代。
10. 安全硬边界全程不破坏: 只读用户配置 / 凭证不进渲染进程 / 扫描路径白名单 / 无遥测。
11. 过程纪律: 小步提交 + 推送 + CI 绿 (harness:prepush / ci:wait); 与在途任务热点文件避撞 (gh-103 足迹延后); debt.final 在 verify/archive 前回填。

## 界面质量与交互验收

- 本任务 UI 改动均为**行为保持型重构** (组件收敛 / 逻辑下沉 / 死代码删除), 不引入新视觉设计语言。
- 现有设计系统: HeroUI v2 经 `components/ui` 唯一入口 (本轮验证纪律成立, 零绕行 import); 主题 HSL 变量 + `data-accent`; 虚拟列表子系统是渲染层抽象质量样板。
- 验收口径: 触及页面 (instructions / capabilities / session-detail / usage / overview / settings) 重构前后截图 diff; 四态 (loading/empty/error/data) + 暗色模式不回归; ExpandableAssetCard 收敛涉及 focused→展开 effect 与虚拟列表 focus 行为, 需键盘路径实测; 扫描进度推送 / 项目切换数据流按 memory 配方 (CDP) 真跑采集。
- 已知视觉变化点 (主动声明非回归): ExpandableAssetCard 统一两页 scope badge 漂移 (instructions 覆写 ×6 vs capabilities 裸用) — 统一后 capabilities 视觉会向 instructions 对齐, verify 截图标注。

## 未决问题

1. **范围裁剪** (design 自决, 用户授权全面重构但 13 个在途任务共享工作区): 倾向 — 主题 1 (引擎域)、2 (IPC 契约)、3 (孤儿)、4 (渲染层复用) 的核心项 + 可观测性低成本项进本任务; 打包/安全基线 (主题 6) 与 engine 物理成包 (R12) 体量独立、撞车面小, 落 issues 独立推进; 裁剪结果在 02-SPEC 显式列出。
2. **relations / import-chain / mcp:merged 三个 handler-only 死通道**: 删 (GH-112 归档佐证渲染层已改客户端过滤, 倾向删) vs 补 preload 接线; 删则 engine/relations.ts 评估随之归档。
3. **e2e 矩阵扩 macos**: 重构密集期集成信号收益高, 成本 ~2min/OS; 倾向加, design 定。
4. **gh-103 足迹避让**: chart-colors.ts / globals.css / usage.tsx / overview.tsx / token-usage-display.tsx 相关改动延后到该任务收口, 或严格限定非 chart 段并当轮声明。

