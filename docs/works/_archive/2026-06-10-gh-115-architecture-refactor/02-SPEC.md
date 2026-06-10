# 技术方案 (Design 产物)

每条回指 01-ANALYSIS 的验收标准编号 (AC-1 ~ AC-11)。

## 设计决策来源 (panel 记录)

3 视角提案 (incremental-pragmatic A / target-state-first B / product-trajectory C) × 2 维评审 (regression-safety: A 8 > B 7.2 > C 6.7; architecture-quality: C 8 > A 7.2 > B 6.6); 第三维 execution-economics 评审 agent 因订阅额度触顶失败, 由主 Agent 补评 (A 偿还/改动比最优、C 根因消除最彻底但顶格盘子在 13 任务在途窗口执行压力最大、B 巨石重组 churn 最大且两项 veto 为计划内行为变更)。完整 panel 产物: `assets/design-panel.json`。

**裁决**: 以 A 的排序/安全骨架为基底, 嫁接 C 的根因核心 (capability map 单点分发、per-agent 声明源表、knownDead 白名单红绿循环) 与 B 的机制件 (独立 test project、ARCHITECTURE 例外清单、relations 删除链完整性 + manifest 守卫、boundary i18n 完整性)。两评审的全部 12 条 veto 均已消解 (见各批注记); B 的两条行为变更类 veto 通过"只钉现行为、不选边"原则规避。

**执行模式变更**: 订阅额度触顶 → implement 阶段不再 fan-out 子代理, 由主 Agent 主循环**顺序**执行全部批次; 03-PLAN 的并行分组仅作文件不重叠的事实记录。

## 架构模式选型 (回应 AC-2 / 诉求 f)

**多宿主端口-适配器内核 + 派生单源契约 (Multi-Host Ports & Adapters with Derived Single-Source Contracts)**

选型依据 01-ANALYSIS 15 条现状底图, 非教科书泛论:

1. **berth 的形态 = 一个只读扫描领域核 × 三个宿主装配根** (electron main `index.ts`、worker 入口 `engine/assets/worker.ts`、CLI `packages/berth-scan-engine`)。底图 1/3 实测: electron 值依赖仅 3 文件、better-sqlite3 经工厂注入、worker 闭包对 electron 干净、CLI 迁移最小集 30 文件零阻断 — 端口-适配器的"核心纯、副作用在壳"已经半成形, 缺的不是新模式而是**补完与强制**。
2. **agent 扩展轴是第一公民**: 底图 4/9 证明现有 AgentAdapter 端口与真实消费面错位 (3 死方法 vs 4 类缺位能力), per-agent 知识散落 5+ 处已分叉。目标: per-agent 知识 (扫描源表/descriptors) 全部归位 adapters 侧声明, engine 经 registry/capability map 单点消费 — 接入第 N 个 agent = 新建 adapters 目录 + 注册一处。
3. **契约一律从实现派生, 不养手工副本**: 底图 5 证明四份手工 IPC 契约副本零强制必然漂移。目标: `BerthAPI = typeof api` 派生 + 四方对账测试; 同理扫描源表单源生成多方消费。
4. **渲染层不换模式**: 底图 6 实测分层健康 (无环、3 条反向边、ui 入口纪律成立), 维持 lib→stores→hooks→ui/shared→pages 分层 + 既有不变量 (fold 单写路径) 的修复与强制即可; 结构性组件收敛 (二代抽象) 因 12 个 verify 任务足迹压在热点页上, 延后到独立 issue。
5. **明确拒绝**: DDD 全量分桶/事件总线/一次性 engine 拆包大爆炸 — 底图 15 的共享 master 多 Agent 窗口使大迁移协调成本不可控; 底图 14 的 samePath 四副本收敛先例证明小步单源化在本仓可行, 复制该节奏。

## 目标分层与依赖规则 (落 docs/ARCHITECTURE.md, 回应 AC-2)

| 层 | 内容 | 可依赖 |
|---|---|---|
| shared (`src/shared`) | 跨进程纯类型与纯函数: asset model、IPC 契约 (`IpcChannels` 对账真源)、scope、path-utils、object-guards (新) | (无) |
| main-adapters (`src/main/adapters`) | per-agent 知识: scanner/parsers/**descriptors+sources (声明数据归此侧)** + `_shared` (node 依赖且仅 adapters 域内) | shared |
| main-agent-plugins (`src/main/agent-plugins`) | registry/manifest/adapter-registry + descriptors **聚合 re-export** (解值依赖环后单向) | shared, main-adapters |
| main-engine (`src/main/engine`) | 领域核: assets/runtime、scanner 编排、watcher、search、health、pricing、usage、**session-detail (新)**、**agent-capabilities map (新)**; hooks-manager 留宿主语义 (唯一合法写者) | shared, main-agent-plugins, main-adapters (存量直连冻结: 只减不增, 经 capability map 收敛) |
| main-domains (`src/main/memory`, `src/main/agent-teams`) | 按需只读 IPC 域, 不进 asset/scanner/watcher 管线; home 解析统一走根级 agent-homes | shared, main 根级中立件 (agent-homes / project-config-roots) |
| main-ipc (`src/main/ipc`) | 薄注册与序列化门面: 按域注册; 域逻辑禁止驻留 | electron, main-engine, main-domains, main-agent-plugins, shared |
| main-composition (`src/main/index.ts`, `dev-instance.ts`, `log.ts` 新) | 组合根: electron 装配、进程钩子、log seam (userData 本地, 无遥测) | electron, 全部 main 模块 |
| preload (`src/preload`) | contextBridge 窄桥; `BerthAPI = typeof api` 是 window.api 类型唯一来源 | electron, shared (仅类型) |
| renderer (`src/renderer/src`) | lib(纯逻辑直测) → stores(`setAssetSnapshot` 唯一资产写落点) → hooks → components/ui(HeroUI 唯一入口) → components/shared(≥2 页准入)+components/{feature} → pages(薄) + layout(全局 PageErrorBoundary) | shared, preload 类型 |

**规则 (写入 ARCHITECTURE.md 的可执行形式)**:
1. IPC 四方同步: 通道增删必须同批改 handlers 注册 + preload wrapper + `IpcChannels` 表 + `tests/setup.ts` mock; `tests/unit/ipc-contract.test.ts` 四集合对账不一致即红。
2. window.api 类型唯一来源 = preload `export type BerthAPI = typeof api`; 禁止手写 d.ts 方法签名。
3. electron 值 import 白名单: 仅 `src/main/index.ts`、`dev-instance.ts`、`devtools.ts`、`src/main/ipc/`; engine/adapters/memory/agent-teams/agent-plugins 出现 `import 'electron'` 即违规。
4. main 依赖方向: agent-plugins → adapters → shared 单向; adapters 禁止 import engine/agent-plugins; engine 对 adapter 的新访问一律经 registry/capability map, 存量直连只减不增。
5. 纯函数归属: 无 node 依赖 → src/shared; 有 node 依赖且仅 adapters 域内 → adapters/_shared; **非 adapters 模块禁止 import adapters/_shared** (需要的先升 shared)。
6. renderer 准入: `@heroui/react` 仅 components/ui; components/shared 准入 ≥2 页消费; 页面内联无 React 依赖纯逻辑 >~50 行下沉 lib/ 配直测。
7. store 资产写路径唯一 = `setAssetSnapshot` (foldKeepingShallow 不变量); 禁止新增裸替换 action。
8. 错误处理: 禁止裸 catch 吞错 — catch 必须转 ScanError/HealthCheck 记账或调 `log(scope, err)`; 日志仅落 `userData/logs`, 禁止网络出口。
9. 删除纪律: 删代码同批连带专属测试 / setup.ts mock / i18n key / README 声明; 触碰被源码文本断言钉住的文件时同批改写为行为断言。
10. 打包语义: electron-builder files 加法白名单; dependencies 仅 main/preload 运行时依赖。
11. **例外清单机制 (B 嫁接)**: 分层规则的现存违例 (health.ts 直连两家 adapter 过渡态、hooks-manager 写者、白名单成员变更) 必须在 ARCHITECTURE.md 例外清单登记并附收口 issue 链接, 不登记即违规。
12. 安全四边界不可破坏 (AC-10)。

## 数据契约

- IPC: `src/shared/types/ipc.ts` 的 `IpcChannels`/`IpcEvents` 修正为真实集合并成为对账真源; payload 类型不变 (行为保持)。`PlatformInfo` 收敛单一定义, 删零消费 `claudeDir` 字段。
- preload: `window.api` 运行时形状**不变** (除删除死面); 类型改派生。
- 扫描源: `adapters/{claude-code,codex}/sources.ts` 声明 `{scope, pattern, kind, deriveParser, watch}`; shallow-conventions / derive-asset / watcher 三方接表, **接表前后枚举输出 diff 必须为空** (等价钉测)。settings.local.json 的 2/5-parser 分叉**如实按 per-consumer 建模, 不选边** (B 同名批的 veto 规避); 统一决策记录于 engine-shared-core-package issue。
- session: `engine/session-detail.ts` 迁入后 `sessions:get` 返回值字节级等价 (golden diff 验收)。
- memory splitFrontmatter 两份变体**不收敛**, 各钉 characterization 测试; 收敛归属 engine-shared-core-package (roadmap Phase C 既定)。

## 任务分类与 debt

- type / maintenance.subtype: maintenance / architecture (不变)。
- source.kind / refs: user-request; GH-115。
- debt.estimate: incurred 3 / repaid 12 / net -9 / global / high / [architecture] / medium — design 后维持 explore 校准值, 无新 revision。
- debt.final 预期: repaid ≥10 (T0-T14 全落地); 若 gh-103 足迹批 (T13 globals.css 段) 被迫延后, repaid 下调 1 并在 final.rationale 说明。
- Project 字段同步: archive 前 `harness-projects.mjs done`。
- harness:stats 当前 total=22 (notice, <40): maintenance 任务无需 override。

## 范围裁剪 (回应 AC-3, 34 问题全覆盖)

**inTask 20 项**: R1 (契约收紧+capability map+解环), R2 (handlers 瘦身), R3 (契约派生+对账), R4 (源表三方接表), R5 (可观测性), R6 (deps 归位), R7 (files 白名单), R8→**deferred 例外见下**, R9 (死纵切片), R11 (IPC 死面), R14 (纯助手单源), R18 (home 归一), R19 (吞错簇, 除 pricing/catalog 误指子项 — 两评审证伪其失败路径), R21 (store 死字段), R22 (i18n 死 key), R23 (pricing convert 孤儿删除路线), R26 (fold 单写), R27 (错误边界), R29 (测试网: test project + e2e matrix + 假覆盖删除 + redaction 枚举测试), R34 (长尾孤儿)。

**deferred 14 项** (T14 统一立案/增补, 不静默丢弃):
| 问题 | 处置 | 理由 |
|---|---|---|
| R8 expandable-asset-card-clones (high) | issue-new (并入 heroui-followup 或单立) | 落点 instructions/capabilities 是 3-4 个 verify 任务足迹, 01-ANALYSIS 风险 3 明确建议 12 任务收口后做 |
| R10 electron-window-hardening | issue-new | 独立安全批, 撞车面小; sandbox/url-guard/will-navigate 一次做完 |
| R12 engine 物理成包 | issue-existing (engine-shared-core-package 增补工料) | 既定独立 issue; 本任务 T8/T9/T11 完成其逻辑+工程前置 |
| R13 SWR useCachedResource | issue-existing (renderer-cached-resource-hook 增补第 5 份副本/错误维度/reset 证据) | use-ipc/use-memory 是 verify 足迹; roadmap 既定独立项 |
| R15 health/registry 巨石 + R20 messageKey | **issue-new (合立 health-restructure-and-message-contract)** | 01-ANALYSIS R20 明文"与 health 拆分同批成本最低"; 避免 1453 行文件两轮重写 (A 嫁接) |
| R16 god pages 逻辑下沉 | issue-new | session-detail/capabilities 是多任务足迹热点 |
| R17 session-id 契约 | issue-new | 涉及 id 方案决策与迁移层, 独立推进 |
| R24 design-system 采纳缺口 | issue-existing (heroui-followup 增补量化) | 与 R8 同域同窗口 |
| R25 微 primitive | issue-existing (heroui-followup 增补) | 落点含 gh-103 足迹 (usage/overview) |
| R28 activate 推送绑死旧窗口 | issue-existing (已立 BUG) | 产品 bug, explore 已立案 |
| R30 shared 纯逻辑分叉 | issue-existing (shared-path-and-type-config 增补) | session-location-groups/result-signature 是 gh-98 足迹 |
| R31 distribution-hardening (签名/fuses/ABI 守卫) | issue-existing (macos-release-signing-config 增补 fuses/ABI) | 签名需用户侧证书动作; ABI 冒烟与 worker 产物断言已拉进 T0 (C 嫁接) |
| R32 renderer 目录语义错位 | issue-new (低优) | 3 条反向边均为低风险错位, 与 R16 同窗口顺做 |
| R33 root scope 文件归位 | issue-existing (engine-shared-core-package, 随包切线定) | 两文件在 CLI 闭包内 |

## 模块结构 / 组件拆分 (moduleMoves)

1. `agent-plugins/descriptors.ts` 的 per-agent 数据 → `adapters/claude-code/descriptors.ts` + `adapters/codex/descriptors.ts`; agent-plugins 侧改聚合 re-export (解唯一值依赖环)。 [T8]
2. AgentAdapter 契约删 `scanAssets/watchAssets/resolveRelations` 3 死方法 + 两实现桩。 [T8]
3. 新建 `engine/agent-capabilities.ts`: agentId→{deriveAssetsForFile, parseSessionDetail, healthChecks, watchTargets} 单点 map, engine 7 处直连收敛至此 (C 嫁接: 直连降为 1 处)。 [T8]
4. 新建 `adapters/{claude-code,codex}/sources.ts` 声明源表; shallow-conventions `CAPABILITY_GLOBS` / derive-asset `DISPATCH` / watcher `getAssetWatchPaths` 三方接表。scanner scanAll 散落调用**不动** (全量统一随 engine 包 issue)。 [T9]
5. `ipc/handlers.ts` 的 ~276 行 session/模型推断 → `engine/session-detail.ts`; `toSessionSummary` 收敛 runtime 单实现; 注册按域拆分。 [T10]
6. 无 node 依赖纯守卫 (isRecord/readString/readNumber/safeId/extractAtImports) → `src/shared/object-guards.ts`; `adapters/_shared/parser-helpers.ts` 改 re-export 保持 import 面; health.ts/memory/agent-teams 的本地副本改 import。 [T7]
7. `shared/path-utils.ts` 增 `isPathInside({includeEqual})` + `dedupePaths`, 4 套 2 算法收敛 (per-call-site 保持现行为)。 [T7]
8. `src/main/log.ts` 新建 (log seam); index.ts 进程钩子。 [T5]
9. `components/settings/local-source-copy.ts` → 唯一消费者旁 (layout/); 字典内容不动 (i18next 迁移属 R32, deferred)。 [T3]
10. `preload/index.d.ts` 手写方法签名 → `BerthAPI` 派生。 [T1]
11. JSON 版 `createSnapshotStore` 删除, `stripRaw` 原位保留 (sqlite store 生产消费)。 [T13]
12. **不迁移声明**: agent-homes/project-config-roots 维持根级中立位 (双侧消费); project-scope*.ts 随 engine 包切线定 (R33)。

## 界面质量与交互验收 (AC-9)

| 项目 | 方案 | 验收方式 |
|---|---|---|
| 布局层级 / 信息密度 | 行为保持型重构, 不改布局; T3 删除的均为零引用组件 | 触及页 (instructions/capabilities/settings/sessions/session-detail/overview) 重构前后截图 diff |
| 组件选择 / 设计系统一致性 | 不新增组件; PageErrorBoundary 复用既有组件 + 新增"返回 Overview"动作 (HeroUI Button) | 截图 + 暗色模式 |
| 交互反馈 / 状态切换 | status.error 接入 sidebar-scan-status 呈现 (T6); 错误边界可恢复 (T4) | CDP 真跑: 写坏 .mcp.json 观察记账与 UI 提示; 人为抛渲染错误观察边界与返回动作 |
| loading/empty/error/disabled/focus | 四态不回归 | 各触及页四态截图 (复用既有 testid) |
| 响应式 / 可访问性 / 键盘可达 | 不改交互结构 | 键盘冒烟 (搜索面板/对话框 Escape) |
| 文案 / i18n | 删 24 死 key (T12) + boundary 新增 key (T4); zh 复数收敛 _other | i18n-plural-convention.test + 双语启动冒烟 |
| 数据流 / 时序 (memory 规则) | fold 单写路径 (T4)、推送/记账 (T6)、watch→derive→UI (T9) | CDP 真跑: 项目切换无 shallow 瞬时丢失; 新建 skill 文件观察增量折叠全链 |

## 测试策略 (AC-4~AC-8, 矩阵)

| 变更/行为 | 测试类型 | 测试文件 | 命令 | 例外理由 |
|---|---|---|---|---|
| 测试地基: tests 纳 typecheck | harness | `tsconfig.test.json` (新, B 嫁接: tsc dry-run >15 文件错误则按目录渐进 include) | `pnpm typecheck` | — |
| worker 产物存在性 + ABI | unit + script | `tests/unit/worker-artifact.test.ts` (新) + `scripts/abi-smoke.mjs` (新, C 嫁接) | `pnpm build && node scripts/abi-smoke.mjs` | — |
| e2e 矩阵 | e2e | `.github/workflows/ci.yml` 加 macos-latest; project-scope e2e 红则按已立案 issue test.skip + 交叉引用 | CI | — |
| 凭证 redaction | renderer | `tests/renderer/status-line-redaction.test.tsx` (新, 枚举: env var/inline key/url token/纯命令) | `pnpm test` | — |
| IPC 四方对账 | unit | `tests/unit/ipc-contract.test.ts` (新): handlers 注册 == preload invoke == IpcChannels == setup.ts mock; knownDead 白名单先钉脏现状 (C 嫁接), T2 清零; 落地时注入未注册通道自证变红 (A) | `pnpm test` | — |
| IPC 死面删除 | unit | 同上白名单清零断言 + 既有 hooks-lifecycle-view 测试同步 (删幻影断言) | `pnpm test` | — |
| 死纵切片删除 | renderer | 删保活测试 (asset-guide-panel/asset-guidance); settings 页既有测试守住 LocalSources 不再渲染 | `pnpm test` | 纯减法, 以全量绿 + grep 零残留为证 |
| store 死字段 + fold 单写 | renderer | `tests/renderer/app-store.test.ts` 收缩 + `selectScope` 单写断言 (新增于 store 测试) | `pnpm test` | + CDP 真跑项目切换 |
| 错误边界 | renderer | `tests/renderer/page-error-boundary.test.tsx` 扩: 全路由兜底 + 返回动作 | `pnpm test` | — |
| log seam + 进程钩子 | unit | `tests/unit/main-log.test.ts` (新): 滚动/scope 格式; 钩子注册薄测 | `pnpm test` | electron 装配段以 build 冒烟代替 |
| 吞错簇 | unit | 既有 claude-scanner/codex 测试扩: 坏 .mcp.json fixture → ScanError 记账断言 (先红后绿); detect 异常 → ScanError 断言 | `pnpm test` | + 真跑写坏 .mcp.json |
| object-guards 下沉 | unit | `tests/unit/object-guards.test.ts` (新) + memory 两份 splitFrontmatter characterization (新, 钉现行为含 5 点差异) | `pnpm test` | — |
| path-utils 收敛 | unit | `tests/unit/path-utils.test.ts` 扩 isPathInside/dedupePaths 矩阵 (win32/equal-case) | `pnpm test` | — |
| adapter 契约 + capability map | unit | 既有 adapter/registry 测试收缩 3 死方法 + `tests/unit/agent-capabilities.test.ts` (新): 两 agent 全能力分发等价 | `pnpm test` | — |
| 源表三方接表 | unit | `tests/unit/asset-sources.test.ts` (新): 接表前后 shallow globs/derive dispatch/watch 路径枚举 diff 为空 | `pnpm test` | + 真跑新建 skill 观察全链 |
| session-detail 迁移 | unit | `tests/unit/session-detail.test.ts` (新, 先钉 golden: 模型推断/编排输出) + handlers 薄注册测试 (vi.mock electron) | `pnpm test` | + CDP session 页 |
| home 归一 | unit | memory/agent-teams 既有测试扩 BERTH_EXTRA_CLAUDE_DIRS 用例 (先红后绿, 契约漂移修复) | `pnpm test` | — |
| 打包面 | manual+unit | asar list diff (前后对比) + 启动冒烟 + worker-artifact.test | `pnpm package:mac` 本地 | builder 配置无单测框架, asar diff 是确定性验收 |
| pricing convert 删除 | unit | `tests/unit/pricing.test.ts` 改: 删 convert 三函数用例, 加 catalog.generated schema 校验 | `pnpm test` | — |
| i18n 死 key | renderer | `tests/renderer/i18n-plural-convention.test.ts` (新, C 嫁接) + 既有 i18n 测试全绿 | `pnpm test` | 死 key 删除本身以 grep 门控 + 全量绿为证 |
| 长尾孤儿 | unit | 连带测试同步 (theme-palette 改写为行为断言 — 仅当触碰 globals.css; tokenUsageTotal 测试降级) | `pnpm test` | 纯减法 |

## 验收标准映射

| SPEC 项 | ANALYSIS 验收标准 |
|---|---|
| 架构模式选型 + 分层规则 + ARCHITECTURE.md (T14) | AC-2 |
| 范围裁剪表 + T14 立案 | AC-3 |
| T2/T3/T12/T13 删除批 | AC-4 |
| T1/T2/T10 | AC-5 |
| T7/T8/T9 | AC-6 |
| T3/T4 (+R8 等 deferred 显式立案) | AC-7 |
| T5/T6 | AC-8 |
| 全批门禁 + 截图/CDP | AC-9 |
| 全程 | AC-10, AC-11 |
